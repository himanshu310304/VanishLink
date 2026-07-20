import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Loader2,
  Play,
  Pause,
  MessageCircle,
  Send,
  Users,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import YouTube from 'react-youtube';

import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '');

const WatchRoom = () => {
  const { roomCode } = useParams();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');

  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChatOverlay, setShowChatOverlay] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isYouTube, setIsYouTube] = useState(false);
  const [youtubeId, setYoutubeId] = useState('');

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const htmlVideoRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const socketRef = useRef(null);
  const fullscreenRef = useRef(null);

  // flag: true when we are applying a remote action; prevents echo loop
  const isRemoteActionRef = useRef(false);

  // -------- Load room info --------
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/watch/${roomCode}`);
        setRoom(res.data);
      } catch (err) {
        console.error('Failed to load room', err);
        setError('This watch room does not exist or has ended.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomCode]);

  // -------- Detect YouTube vs normal video --------
  useEffect(() => {
    if (!room?.videoUrl) {
      setIsYouTube(false);
      setYoutubeId('');
      return;
    }

    const url = room.videoUrl;
    const match = url.match(
      /(?:youtube\.com\/.*v=|youtu\.be\/)([A-Za-z0-9_-]{11})/i,
    );

    if (match && match[1]) {
      setIsYouTube(true);
      setYoutubeId(match[1]);
    } else {
      setIsYouTube(false);
      setYoutubeId('');
    }
  }, [room]);

  // -------- Fullscreen change listener --------
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        setShowChatOverlay(false);
        setUnreadCount(0);
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // -------- helpers to get time/duration from current player --------
  const getCurrentTime = () => {
    if (isYouTube) {
      return ytPlayerRef.current?.getCurrentTime?.() || 0;
    }
    return htmlVideoRef.current?.currentTime || 0;
  };

  const getDuration = () => {
    if (isYouTube) {
      return ytPlayerRef.current?.getDuration?.() || 0;
    }
    return htmlVideoRef.current?.duration || 0;
  };

  // -------- emit playback actions over socket --------
  const emitPlayerAction = (action, explicitTime) => {
    if (!socketRef.current || !room) return;

    const time =
      typeof explicitTime === 'number' ? explicitTime : getCurrentTime();

    socketRef.current.emit('player-action', {
      roomCode,
      action,
      time,
    });
  };

  // -------- socket.io setup --------
  useEffect(() => {
    if (!room || error) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', {
        roomCode,
        userName: userName || 'Guest',
      });
    });

    // Remote playback: apply play/pause/seek from others
    socket.on('player-action', ({ action, time }) => {
      isRemoteActionRef.current = true; // mark next state change as remote

      if (isYouTube) {
        const player = ytPlayerRef.current;
        if (!player) return;

        if (typeof time === 'number' && !Number.isNaN(time)) {
          try {
            player.seekTo(time, true);
          } catch {
            /* ignore */
          }
        }

        if (action === 'PLAY') {
          try {
            player.playVideo();
          } catch {
            // autoplay policy may block this on some tabs
          }
        } else if (action === 'PAUSE') {
          player.pauseVideo();
        }
      } else {
        const video = htmlVideoRef.current;
        if (!video) return;

        if (typeof time === 'number' && !Number.isNaN(time)) {
          try {
            video.currentTime = time;
          } catch {
            /* ignore */
          }
        }

        if (action === 'PLAY') {
          video.play().catch(() => {});
        } else if (action === 'PAUSE') {
          video.pause();
        }
      }

      // UI state will be updated by our local event listeners
    });

    // Chat
    socket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);

      if (isFullscreen && !showChatOverlay) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    socket.on('user-joined', ({ userName: joinedName }) => {
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          message: `${joinedName} joined the room`,
          ts: Date.now(),
        },
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, [room, error, roomCode, userName, isYouTube, isFullscreen, showChatOverlay]);

  // -------- poll time/duration --------
  useEffect(() => {
    if (!room) return;

    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
      setDuration(getDuration());
    }, 500);

    return () => clearInterval(interval);
  }, [room, isYouTube]);

  // -------- PLAY / PAUSE from our buttons (local only) --------
  // These just control the player; socket broadcast happens in the
  // onPlay/onPause / onStateChange handlers so ALL causes are captured.

  const handlePlayClick = () => {
    if (isYouTube) {
      const player = ytPlayerRef.current;
      if (!player) return;
      try {
        player.playVideo();
      } catch (err) {
        console.error('YT play failed', err);
      }
    } else {
      const video = htmlVideoRef.current;
      if (!video) return;
      video.play().catch((err) => console.error('Play failed', err));
    }
  };

  const handlePauseClick = () => {
    if (isYouTube) {
      const player = ytPlayerRef.current;
      if (!player) return;
      player.pauseVideo();
    } else {
      const video = htmlVideoRef.current;
      if (!video) return;
      video.pause();
    }
  };

  // -------- HTML video play/pause handlers (real events) --------
  const handleHtmlPlay = () => {
    setIsPlaying(true);

    if (isRemoteActionRef.current) {
      // this play was triggered from a remote sync; don't rebroadcast
      isRemoteActionRef.current = false;
      return;
    }

    emitPlayerAction('PLAY');
  };

  const handleHtmlPause = () => {
    setIsPlaying(false);

    if (isRemoteActionRef.current) {
      isRemoteActionRef.current = false;
      return;
    }

    emitPlayerAction('PAUSE');
  };

  // -------- YouTube state handler (real events) --------
  const handleYTStateChange = (e) => {
    // YT states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    if (e.data === 1) {
      // playing
      setIsPlaying(true);

      if (isRemoteActionRef.current) {
        isRemoteActionRef.current = false;
        return;
      }
      emitPlayerAction('PLAY');
    } else if (e.data === 2) {
      // paused
      setIsPlaying(false);

      if (isRemoteActionRef.current) {
        isRemoteActionRef.current = false;
        return;
      }
      emitPlayerAction('PAUSE');
    }
  };

  // -------- Seeking (slider) --------
  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    if (Number.isNaN(newTime)) return;

    if (isYouTube) {
      const player = ytPlayerRef.current;
      if (!player) return;
      player.seekTo(newTime, true);
    } else {
      const video = htmlVideoRef.current;
      if (!video) return;
      video.currentTime = newTime;
    }

    emitPlayerAction('SEEK', newTime);
    setCurrentTime(newTime);
  };

  const handleToggleMute = () => {
    if (isYouTube) {
      const player = ytPlayerRef.current;
      if (!player) return;

      if (isMuted) {
        player.unMute();
      } else {
        player.mute();
      }
    } else {
      const video = htmlVideoRef.current;
      if (!video) return;
      video.muted = !isMuted;
    }
    setIsMuted((prev) => !prev);
  };

  const handleVolumeChange = (e) => {
    const v = Number(e.target.value);
    if (Number.isNaN(v)) return;
    setVolume(v);

    if (isYouTube) {
      const player = ytPlayerRef.current;
      player?.setVolume?.(v);
      setIsMuted(v === 0);
    } else {
      const video = htmlVideoRef.current;
      if (!video) return;
      video.volume = v / 100;
      video.muted = v === 0;
      setIsMuted(v === 0);
    }
  };

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);

    if (isYouTube) {
      const player = ytPlayerRef.current;
      player?.setPlaybackRate?.(rate);
    } else {
      const video = htmlVideoRef.current;
      if (!video) return;
      video.playbackRate = rate;
    }
  };

  const handleToggleFullscreen = () => {
    const container = fullscreenRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch((err) => {
        console.error('Fullscreen error', err);
      });
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !socketRef.current) return;

    socketRef.current.emit('chat-message', {
      roomCode,
      userName: userName || 'Guest',
      message: text,
    });

    setChatInput('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-900 dark:text-white">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-400 text-sm">Spinning up your watch room…</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 bg-white dark:bg-slate-900 border-red-500/20 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Watch Room Error</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">{error}</p>
        </Card>
      </div>
    );
  }

  const safeDuration = duration || 0;
  const safeCurrent = Math.min(currentTime, safeDuration);

  // ---------- reusable pieces ----------

  const renderPlayer = () => (
    <div className="bg-slate-50 dark:bg-black w-full">
      <div className="aspect-video w-full">
        {isYouTube && youtubeId ? (
          <YouTube
            videoId={youtubeId}
            className="w-full h-full"
            iframeClassName="w-full h-full"
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                controls: 0, // only our custom controls
                rel: 0,
              },
            }}
            onReady={(e) => {
              ytPlayerRef.current = e.target;
              e.target.setVolume(volume);
              setDuration(e.target.getDuration() || 0);
            }}
            onStateChange={handleYTStateChange}
          />
        ) : (
          <video
            ref={htmlVideoRef}
            src={room.videoUrl}
            className="w-full h-full bg-slate-50 dark:bg-black"
            controls={false}
            onLoadedMetadata={(ev) => {
              setDuration(ev.target.duration || 0);
            }}
            onPlay={handleHtmlPlay}
            onPause={handleHtmlPause}
          />
        )}
      </div>
    </div>
  );

  const renderControls = (fullscreen = false) => (
    <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 bg-white dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            type="button"
            onClick={isPlaying ? handlePauseClick : handlePlayClick}
            className="rounded-full"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300 min-w-[90px]">
            {formatTime(safeCurrent)} / {formatTime(safeDuration)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* volume */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 text-slate-100"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={handleVolumeChange}
              className="w-24"
            />
          </div>

          {/* speed */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-600 dark:text-slate-400 mr-1">Speed</span>
            {[1, 1.25, 1.5, 2].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleSpeedChange(r)}
                className={`px-2 py-1 rounded-md border text-[11px] ${
                  playbackRate === r
                    ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500/60'
                }`}
              >
                {r}x
              </button>
            ))}
          </div>

          {/* unread-chat badge (fullscreen only) */}
          {fullscreen && (
            <button
              type="button"
              onClick={() => {
                setShowChatOverlay(true);
                setUnreadCount(0);
              }}
              className="relative p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 text-slate-100"
              title="Open chat"
            >
              <MessageCircle className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[9px] px-1.5 rounded-full bg-red-500 text-slate-900 dark:text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {/* fullscreen */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 text-slate-100"
            title="Toggle fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={safeDuration || 0}
        value={safeCurrent}
        onChange={handleSeek}
        className="w-full"
      />
    </div>
  );

  const renderChatCard = (fullscreen = false) => (
    <Card
      className={
        fullscreen
          ? 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 flex flex-col h-full'
          : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 flex flex-col max-h-[calc(100vh-5rem)]'
      }
    >
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium">Chat</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Your name in chat (e.g. Tokyo)"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-xs">
        {messages.length === 0 && (
          <p className="text-slate-500 text-xs italic">
            No messages yet. Say hi 👋
          </p>
        )}

        {messages.map((msg, idx) =>
          msg.system ? (
            <div
              key={idx}
              className="text-[10px] text-slate-500 text-center italic"
            >
              {msg.message}
            </div>
          ) : (
            <div key={idx} className="flex flex-col">
              <span className="text-[10px] text-slate-500 mb-0.5">
                {msg.userName || 'Guest'}
              </span>
              <div className="inline-block max-w-[90%] rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-[11px] text-slate-100">
                {msg.message}
              </div>
            </div>
          ),
        )}
      </div>

      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
      >
        <Input
          placeholder="Send a message…"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );

  // ---------- main render ----------

  return (
    <div
      ref={fullscreenRef}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-100 flex flex-col"
    >
      {/* header */}
      <header className="border-b border-slate-900 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">
            VanishLink Watch
          </p>
          <h1 className="text-sm sm:text-base font-semibold">
            {room.title || 'Watch Party'}
          </h1>
          <p className="text-[11px] text-slate-500">
            Room code: <span className="font-mono">{room.roomCode}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <Users className="w-4 h-4" />
          <span>Live</span>
        </div>
      </header>

      {/* layout */}
      <main className={`flex-1 ${isFullscreen ? 'p-0' : 'p-4'}`}>
        <div
          className={`grid h-full relative ${
            isFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3 gap-4'
          }`}
        >
          {/* video side */}
          <div
            className={`flex flex-col bg-slate-50 dark:bg-black ${
              isFullscreen ? 'col-span-1' : 'lg:col-span-2'
            }`}
          >
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-black">
              <div className="w-full max-w-6xl">
                {renderPlayer()}
              </div>
            </div>
            {renderControls(isFullscreen)}
          </div>

          {/* normal chat on the right when not fullscreen */}
          {!isFullscreen && (
            <div className="lg:col-span-1">{renderChatCard(false)}</div>
          )}

          {/* fullscreen chat overlay */}
          {isFullscreen && (
            <>
              {/* hover edge */}
              <div
                className="absolute inset-y-0 right-0 w-3 cursor-pointer"
                onMouseEnter={() => {
                  setShowChatOverlay(true);
                  setUnreadCount(0);
                }}
              />
              {showChatOverlay && (
                <div
                  className="absolute top-0 right-0 h-full w-full max-w-sm bg-slate-50 dark:bg-slate-950/70 backdrop-blur-md border-l border-slate-200 dark:border-slate-800"
                  onMouseLeave={() => setShowChatOverlay(false)}
                >
                  {renderChatCard(true)}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

function formatTime(t) {
  if (!t || Number.isNaN(t)) return '00:00';
  const total = Math.floor(t);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(
    2,
    '0',
  )}`;
}

export default WatchRoom;
