import React, { useEffect, useRef, useState } from "react";
import { logo, person2, person3, cancel } from "../assets";
import { Link, useNavigate, useParams } from "react-router-dom";
import MeetFeeds from "./MeetFeeds";
import { useDataLayerValue } from "../Datalayer/DataLayer";
import {
  config,
  useRTCClient,
  useMicrophoneAndCameraTracks,
  useRTMClient,
} from "./commSettings";
import MeetControls from "./MeetControls";
import { Api } from "../Api/Axios";

const MeetingPage = () => {
  // agora variables and functions
  const [start, setStart] = useState(false);
  const [name, setName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [participants, setParticipants] = useState([]);
  const rtc__client = useRTCClient();
  const rtm__client = useRTMClient();
  const [connectionEstablished, setConnectionEstablished] = useState(false);
  const { ready, tracks } = useMicrophoneAndCameraTracks();
  const [uid, setUid] = useState(String(Math.floor(Math.random() * 10000)));
  const { state, startLoading, stopLoading, showError, showSuccess, showInfo } =
    useDataLayerValue();
  const navigate = useNavigate();
  let channelRef = useRef();
  const [memberDetails, setMemberDetails] = useState([]);
  const [chats, setChats] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [duration, setDuration] = useState(0);
  const urlParams = useParams();

  const init = async (roomName) => {
    // RTM

    try {
      await rtm__client.login({ uid });
      await rtm__client.addOrUpdateLocalUserAttributes({
        name: name,
        uid: uid,
      });
      let channel = await rtm__client.createChannel(roomName);
      channelRef.current = channel;
      await channelRef.current.join();

      channelRef.current.on("MemberJoined", handleMemberJoined);
      channelRef.current.on("MemberLeft", handleMemberLeft);
      channelRef.current.on("ChannelMessage", handleRecieveMessage);
      getAllMemberDetails();
    } catch (err) {
      console.log(err);
    }

    // RTC

    rtc__client.on("user-published", async (user, mediaType) => {
      await rtc__client.subscribe(user, mediaType);
      if (mediaType === "video") {
        if (participants.filter((p) => p.uid === user.uid)) {
          setParticipants((prevParts) =>
            prevParts.filter((p) => p.uid !== user.uid)
          );
        }
        setParticipants((prevParts) => [...prevParts, user]);
      }
      if (mediaType === "audio") {
        user?.audioTrack?.play();
      }
    });

    rtc__client.on("user-unpublished", (user, mediaType) => {
      if (mediaType === "audio") {
        if (user.audioTrack) {
          user.audioTrack.stop();
        }
        if (mediaType === "video") {
          setParticipants((prevParts) =>
            prevParts.filter((p) => p.uid !== user.uid)
          );
        }
      }
    });

    rtc__client.on("user-left", async (user) => {
      await handleMemberLeft(user.uid);
      setParticipants((prevParts) =>
        prevParts.filter((p) => p.uid !== user.uid)
      );
    });

    try {
      await rtc__client?.join(config.APP_ID, roomName, config.token, uid);
    } catch (err) {
      console.log(err);
    }

    if (tracks) {
      await rtc__client.publish([tracks[0], tracks[1]]);
    }
    setStart(true);
  };

  // const createSocketConnection = async (room_id) => {
  //   // startLoading();
  //   const uid = state?.userData?._id;
  //   const baseURL = import.meta.env.VITE_SOCKET_URL;
  //   await Api.post("/meet/join-meeting", { meeting_id: room_id })
  //     .then((res) => {
  //       const session_token = res.data.session_token;
  //       const newSocket = new WebSocket("ws://localhost:3001");
  //       newSocket.onopen = () => {
  //         console.log("Connection established");
  //         const data = {
  //           action: "addConnection",
  //           user_id: uid,
  //           session_token: session_token,
  //         };
  //         newSocket.send(JSON.stringify(data));
  //         socketRef.current = newSocket;
  //       };
  //       setConnectionEstablished(true);
  //     })
  //     .catch((err) => {
  //       navigate("/");
  //       showError(err?.response?.data?.message);
  //     });
  //   // stopLoading();
  // };

  const joinMeeting = async (room_id) => {
    // startLoading();
    console.log("In route");

    await Api.post("/meet/join-meeting", { meeting_id: room_id })
      .then((res) => {
        setConnectionEstablished(true);
      })
      .catch((err) => {
        navigate("/");
        showError(err?.response?.data?.message);
      });
    // stopLoading();
  };

  useEffect(() => {
    if (state.loggedIn) {
      setName(state?.userData?.name);
    }
  }, [state.loggedIn]);

  useEffect(() => {
    setChannelName(urlParams?.roomId);
  }, [urlParams]);

  const getTime = () => {
    const d = new Date();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();

    let formattedHours = hours % 12;
    if (formattedHours === 0) {
      formattedHours = 12;
    }

    const ampm = hours >= 12 ? "PM" : "AM";

    return `${formattedHours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")} ${ampm}`;
  };

  const getDate = () => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const d = new Date();
    const date = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();

    return `${date} ${months[month]}, ${year}`;
  };

  const [chatOpen, setChatOpen] = useState(false);

  const toggleChat = () => {
    setChatOpen(!chatOpen);
  };

  const formatTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const startTime = new Date();
    const interval = setInterval(() => {
      const currentTime = new Date();
      const elapsed = Math.floor((currentTime - startTime) / 1000);
      // Calculate elapsed seconds
      setDuration(elapsed);
    }, 1000);

    // Cleanup the interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const handleMemberJoined = async (MemberId) => {
    let { name, uid } = await rtm__client.getUserAttributesByKeys(MemberId, [
      "name",
      "uid",
    ]);
    showInfo(`${name} joined the call`);
    setMemberDetails((prev) => [...prev, { name, uid }]);
  };

  const handleMemberLeft = async (MemberId) => {
    try {
      const { name, uid } = await rtm__client.getUserAttributesByKeys(
        MemberId,
        ["name", "uid"]
      );
      console.log("Member left ... :(" + name);
      showInfo(`${name} left the call`);
    } catch (error) {
      console.log(error);
    }
  };

  const getAndAddMemberDetails = async (memberId) => {
    const { name, uid } = await rtm__client.getUserAttributesByKeys(memberId, [
      "name",
      "uid",
    ]);
    setMemberDetails((prev) => [...prev, { name, uid, mic__muted: false }]);
  };

  const getAllMemberDetails = async () => {
    let members = await channelRef.current?.getMembers();
    for (let i = 0; i < members.length; i++) {
      getAndAddMemberDetails(members[i]);
    }
  };

  const handleRecieveMessage = async (messageData, MemberId) => {
    console.log("Message Recieved");
    let data = JSON.parse(messageData.text);
    if (data.type === "chat") {
      console.log(data);
      setChats((chats) => [...chats, data]);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage === "") {
      return;
    }
    let __message = newMessage;
    __message = __message.trim();

    const newChat = {
      type: "chat",
      name: name,
      uid: uid,
      time: getTime(),
      picture: "",
      message: __message,
    };

    setChats((chats) => [...chats, newChat]);
    channelRef.current.sendMessage({ text: JSON.stringify(newChat) });

    setNewMessage("");
  };

  useEffect(() => {
    let timeoutId;
    if (!state.loggedIn) {
      timeoutId = setTimeout(() => {
        if (!state.loggedIn) {
          navigate("/");
          showError("User is not logged in");
        }
      }, 1000);
    }
    if (state.loggedIn && channelName !== "" && name && ready && tracks) {
      try {
        if (!connectionEstablished) {
          console.log("Hit route");
          joinMeeting(channelName);
        }
        init(channelName);
      } catch (err) {
        console.log(err);
      }
    }
    return () => {
      try {
        rtc__client.leave();
        channelRef.current?.leave();
        rtm__client.logout();

        if (tracks) {
          tracks[1].stop();
          tracks[1].close();
          tracks[0].stop();
          tracks[0].close();
        }
        // socketRef.current.close();
      } catch (error) {}
      clearTimeout(timeoutId);
    };
  }, [state, channelName, rtc__client, ready, tracks]);

  return (
    <div className="meeting-dock bg-primary w-full h-full overflow-hidden">
      <div className="flex flex-1 flex-col h-full">
        {/* Top portion  */}

        <div className="meet-top flex-[0.05] flex items-center">
          <Link to="/">
            <img
              src={logo}
              alt="meetup"
              className="w-[90px] xs:w-[124px] xs:h-[45px]"
            />
          </Link>
          <div className="h-[80%] w-[1px] bg-dimWhite ml-5 mr-5"></div>
          <span className="text-[14px] xs:text-[14px] hidden sm:block">
            Very Good Meeting
          </span>
          <span className="sm:hidden text-[14px] xs:text-[16px]">
            {channelName}
          </span>
          <div className="w-fit bg-[rgba(255,255,255,0.2)] px-3 py-1 ml-auto ss:ml-5 rounded-xl text-[14px] xs:text-[16px]">
            {formatTime(duration)}
          </div>
          <span className="ml-0 ss:ml-auto hidden ss:block ">
            {getTime()} | {getDate()}
          </span>
        </div>

        {/* Bottom portion */}

        <div className="flex-[0.95] flex w-full h-[89%] relative">
          {/* Bottom left portion */}

          <div
            className={`flex flex-col  ${
              chatOpen ? "w-[100%] sm:w-[80%]" : "w-[100%]"
            }`}
          >
            <div className="flex-[0.95] flex justify-center overflow-hidden ">
              <MeetFeeds
                tracks={tracks}
                participants={participants}
                rtc__client={rtc__client}
                memberDetails={memberDetails}
                name={name}
              />
            </div>
            {/* Meeting controls */}
            <MeetControls
              toggleChat={toggleChat}
              tracks={tracks}
              channelRef={channelRef}
              uid={uid}
            />
          </div>

          {/* Meet sidebar */}
          {chatOpen && (
            <div className="meet-sidebar w-full flex flex-col justify-between bg-[rgb(24,24,35,0.75)] backdrop-blur-[3px] sm:bg-[rgba(24,24,35,0.2)] rounded-[8px] sm:w-[400px] h-[100%] absolute sm:static">
              {/* Chat section */}
              <div className="meet-sidebar-chat  flex-[0.88] overflow-y-scroll relative">
                <div
                  className="absolute right-5 top-3 block sm:hidden"
                  onClick={() => toggleChat()}
                >
                  <img src={cancel} className="w-[25px]" />
                </div>
                <p className="text-center my-3 mx-5 underline underline-offset-8">
                  Messages
                </p>
                {chats?.map((chat, i) => {
                  if (chat?.uid === uid) {
                    // user's message
                    return (
                      <div className="flex flex-col p-5" key={chat?.uid}>
                        <div className="flex flex-row-reverse">
                          <img
                            src={person3}
                            alt="name"
                            className="w-[42px] h-[42px] object-cover rounded-[5px]"
                          />
                          <div className="flex flex-col mr-4 w-[83%]">
                            <div className="flex flex-row-reverse justify-between">
                              <span className="text-dimWhite">You</span>
                              <span className="text-[rgb(131,132,138)]">
                                {chat?.time}
                              </span>
                            </div>
                            <p className="bg-[rgba(35,38,46,0.5)] sm:bg-[rgba(35,38,46,0.5)] rounded-[8px] rounded-tr-none my-3 p-3 text-end overflow-auto">
                              {chat?.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // other's message
                    return (
                      <div className="flex flex-col p-5 " key={i}>
                        <div className="flex">
                          <img
                            src={person2}
                            alt="name"
                            className="w-[42px] h-[42px] object-cover rounded-[5px]"
                          />
                          <div className="flex flex-col w-full ml-4">
                            <div className="flex justify-between">
                              <span className="text-dimWhite">
                                {chat?.name}
                              </span>
                              <span className="text-[rgb(131,132,138)]">
                                {chat?.time}
                              </span>
                            </div>
                            <p className="bg-[rgba(35,38,46,0.5)] sm:bg-[rgba(35,38,46,0.5)] rounded-[8px] rounded-tl-none my-3 p-3 text-start overflow-auto">
                              {chat?.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>

              {/* Send message */}
              <form
                className="flex-[0.1] px-5 w-full mt-3"
                onSubmit={(e) => sendMessage(e)}
              >
                <input
                  type="text"
                  placeholder="Type a message..."
                  className=" px-3 py-2 bg-[rgba(35,38,46,0.5)] sm:bg-[rgba(35,38,46,0.5)] rounded-[8px] rounded-tr-none rounded-br-none w-[80%]"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-[rgb(0,209,205)] rounded-[8px] rounded-tl-none rounded-bl-none w-[20%] overflow-hidden"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingPage;
