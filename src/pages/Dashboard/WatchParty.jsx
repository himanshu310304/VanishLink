import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, User, Link as LinkIcon, Copy } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import api from '../../services/api';
import { useClipboard } from '../../hooks/useClipboard';
import { APP_BASE_URL } from '../../config/appUrl';

const WatchParty = () => {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [hostName, setHostName] = useState('');
  const [loading, setLoading] = useState(false);

  const [roomCode, setRoomCode] = useState('');
  const [roomLink, setRoomLink] = useState('');

  const { copy } = useClipboard();
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!videoUrl.trim()) return;

    setLoading(true);
    try {
      const res = await api.post('/watch/create', {
        title: title.trim() || undefined,
        videoUrl: videoUrl.trim(),
        hostName: hostName.trim() || undefined,
      });

      const createdCode = res.data.roomCode;
      setRoomCode(createdCode);

      const base = APP_BASE_URL || window.location.origin;
      const cleanBase = base.replace(/\/+$/, '');
      const link = `${cleanBase}/watch/${createdCode}`;
      setRoomLink(link);
    } catch (err) {
      console.error('Failed to create watch room', err);
      // optional: toast here if you have toast in this file
    } finally {
      setLoading(false);
    }
  };

  const handleJoinNow = () => {
    if (!roomCode) return;
    navigate(`/watch/${roomCode}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Video className="w-6 h-6 text-emerald-500" />
          Start a Watch Party
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          Create a room and share a single link so everyone can watch together and chat in real-time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1.3fr)]">
        {/* Create form */}
        <Card className="bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 p-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Movie / Episode Title (optional)"
              placeholder="Money Heist S03E01"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              icon={<Video className="w-4 h-4" />}
            />

            <Input
              label="Streaming URL"
              placeholder="https://netflix.com/... or https://video.cdn/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              required
              icon={<LinkIcon className="w-4 h-4" />}
            />

            <Input
              label="Your Name (shown in chat)"
              placeholder="Tokyo, Professor, etc."
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              icon={<User className="w-4 h-4" />}
            />

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button type="submit" isLoading={loading}>
                {loading ? 'Creating room…' : 'Create Watch Room'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Share panel */}
        <Card className="bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Invite Your Squad</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Once the room is created, share the magic link below. Anyone with the link can join the room.
          </p>

          {roomCode ? (
            <>
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                  Room Code
                </p>
                <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 font-mono text-sm text-emerald-400">
                  {roomCode}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                  Shareable Link
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300 break-all">
                    {roomLink}
                  </div>
                  <button
                    type="button"
                    onClick={() => roomLink && copy(roomLink)}
                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    title="Copy link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Button type="button" className="mt-2 w-full" onClick={handleJoinNow}>
                Join Room as Host
              </Button>
            </>
          ) : (
            <div className="text-xs text-slate-500 italic">
              Create a room to generate a shareable link.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default WatchParty;
