import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useListBack } from '../hooks/useListNavigation';
import { toast } from 'sonner';
import {
  supportService,
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES,
  SUPPORT_PRIORITIES,
  categoryLabel,
  statusMeta,
} from '../services/supportService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ArrowLeft, Send, Paperclip, X, FileText, Film, Image as ImageIcon,
  CheckCircle2, User, Clock, Smartphone, Globe, ShieldAlert,
} from 'lucide-react';

function toneClasses(tone) {
  switch (tone) {
    case 'blue': return 'bg-blue-100 text-blue-800';
    case 'amber': return 'bg-amber-100 text-amber-800';
    case 'purple': return 'bg-purple-100 text-purple-800';
    case 'green': return 'bg-green-100 text-green-800';
    case 'gray':
    default: return 'bg-gray-100 text-gray-700';
  }
}

function AttachmentChip({ att }) {
  const isImage = (att.mimeType || '').startsWith('image/');
  const isVideo = (att.mimeType || '').startsWith('video/');
  const url = att.key; // B2 middleware replaces this with presigned URL in responses
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img
          src={url}
          alt={att.originalName}
          className="w-24 h-24 object-cover rounded border border-gray-200"
        />
      </a>
    );
  }
  const Icon = isVideo ? Film : FileText;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
    >
      <Icon className="w-4 h-4" />
      <span className="truncate max-w-[200px]">{att.originalName || 'attachment'}</span>
    </a>
  );
}

function SourceBadge({ source }) {
  const icon = source === 'web' ? Globe : source === 'app' ? Smartphone : ShieldAlert;
  const Icon = icon;
  return (
    <Badge variant="outline" className="capitalize inline-flex items-center gap-1">
      <Icon className="w-3 h-3" /> {source}
    </Badge>
  );
}

function MessageBubble({ msg }) {
  const isAdmin = msg.authorRole === 'admin';
  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg px-4 py-3 ${isAdmin ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
          <User className="w-3 h-3" />
          <span className="font-medium text-gray-700">{msg.authorName || (isAdmin ? 'Support' : 'User')}</span>
          <span>·</span>
          <Clock className="w-3 h-3" />
          <span>{new Date(msg.createdAt).toLocaleString()}</span>
        </div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">{msg.body}</div>
        {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {msg.attachments.map((att) => (
              <AttachmentChip key={att._id} att={att} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const SupportTicketDetail = () => {
  const { id } = useParams();
  const goBack = useListBack('/support');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [notiSending, setNotiSending] = useState(false);
  const [composerTab, setComposerTab] = useState('reply');
  const fileInputRef = useRef(null);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const data = await supportService.getTicket(id);
      setTicket(data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load ticket');
      goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); /* eslint-disable-next-line */ }, [id]);

  const timeline = useMemo(() => {
    if (!ticket) return [];
    const initial = {
      _id: 'initial',
      author: ticket.submitterUser?._id || null,
      authorRole: 'user',
      authorName: ticket.submitterUser?.name || ticket.name || ticket.email,
      body: ticket.description,
      attachments: ticket.attachments || [],
      createdAt: ticket.createdAt,
    };
    return [initial, ...(ticket.messages || [])];
  }, [ticket]);

  const handlePatch = async (changes) => {
    try {
      const updated = await supportService.patchTicket(id, changes);
      setTicket((t) => ({ ...t, ...updated }));
      toast.success('Ticket updated');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    }
  };

  const handleFilePick = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
    e.target.value = '';
  };
  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSendReply = async (andResolve = false) => {
    if (!reply.trim()) return;
    try {
      setSending(true);
      const updated = await supportService.replyTicket(id, reply.trim(), files);
      setTicket((t) => ({ ...t, ...updated }));
      setReply('');
      setFiles([]);
      toast.success('Reply sent');
      if (andResolve) await handlePatch({ status: 'resolved' });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    try {
      setNotiSending(true);
      const updated = await supportService.addNote(id, note.trim());
      setTicket((t) => ({ ...t, ...updated }));
      setNote('');
      toast.success('Note saved');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to save note');
    } finally {
      setNotiSending(false);
    }
  };

  if (loading || !ticket) return <div className="p-10 text-center text-gray-500">Loading…</div>;

  const sMeta = statusMeta(ticket.status);
  const md = ticket.metadata || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="font-mono text-sm text-gray-500">{ticket.ticketNumber}</div>
        <span className={`text-xs rounded px-2 py-0.5 ${toneClasses(sMeta.tone)}`}>{sMeta.label}</span>
        <SourceBadge source={ticket.source} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: controls */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={ticket.status} onValueChange={(v) => handlePatch({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <Button variant="default" className="w-full" onClick={() => handlePatch({ status: 'resolved' })}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Mark resolved
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Priority</CardTitle></CardHeader>
            <CardContent>
              <Select value={ticket.priority} onValueChange={(v) => handlePatch({ priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORT_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Category</CardTitle></CardHeader>
            <CardContent>
              <Select value={ticket.category} onValueChange={(v) => handlePatch({ category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Center: thread */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{ticket.subject}</CardTitle>
              <div className="text-xs text-gray-500">
                Opened {new Date(ticket.createdAt).toLocaleString()} · {categoryLabel(ticket.category)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {timeline.map((msg) => <MessageBubble key={msg._id} msg={msg} />)}
            </CardContent>
          </Card>

          {ticket.status !== 'closed' && (
            <Card>
              <CardContent className="p-4">
                <Tabs value={composerTab} onValueChange={setComposerTab}>
                  <TabsList>
                    <TabsTrigger value="reply">Reply to user</TabsTrigger>
                    <TabsTrigger value="note">Internal note</TabsTrigger>
                  </TabsList>
                  <TabsContent value="reply" className="space-y-3 pt-3">
                    <Textarea
                      placeholder="Type your reply to the user…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={5}
                    />
                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {files.map((f, i) => (
                          <div key={i} className="inline-flex items-center gap-2 text-xs bg-gray-100 rounded px-2 py-1">
                            <span className="max-w-[180px] truncate">{f.name}</span>
                            <button onClick={() => removeFile(i)}><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept="image/*,video/*,application/pdf"
                        onChange={handleFilePick}
                      />
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="w-4 h-4 mr-2" /> Attach
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" disabled={sending || !reply.trim()} onClick={() => handleSendReply(true)}>
                          Send &amp; resolve
                        </Button>
                        <Button disabled={sending || !reply.trim()} onClick={() => handleSendReply(false)}>
                          <Send className="w-4 h-4 mr-2" /> Send
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="note" className="space-y-3 pt-3">
                    <Textarea
                      placeholder="Internal note (never sent to the user)…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={4}
                    />
                    <div className="flex justify-end">
                      <Button disabled={notiSending || !note.trim()} onClick={handleAddNote}>Save note</Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {Array.isArray(ticket.internalNotes) && ticket.internalNotes.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Internal notes</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {ticket.internalNotes.map((n) => (
                  <div key={n._id} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">
                      <strong className="text-gray-700">{n.authorName || 'Admin'}</strong> · {new Date(n.createdAt).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{n.body}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: metadata + submitter */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Submitter</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="font-medium">{ticket.submitterUser?.name || ticket.name || '—'}</div>
              <div className="text-gray-500 break-all">{ticket.email}</div>
              {ticket.submitterUser?._id && (
                <Link to={`/users?search=${encodeURIComponent(ticket.email)}`} className="text-blue-600 text-xs underline">
                  Open user profile
                </Link>
              )}
            </CardContent>
          </Card>

          {ticket.source === 'app' && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">App / device</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1 text-gray-700">
                <div><span className="text-gray-500">App version:</span> {md.appVersion || '—'}</div>
                <div><span className="text-gray-500">OS:</span> {md.osVersion || '—'}</div>
                <div><span className="text-gray-500">Device:</span> {md.deviceModel || '—'}</div>
                <div><span className="text-gray-500">Platform:</span> {md.platform || '—'}</div>
                <div><span className="text-gray-500">Timezone:</span> {md.timezone || '—'}</div>
              </CardContent>
            </Card>
          )}

          {ticket.source === 'web' && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Browser</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1 text-gray-700">
                <div className="break-words"><span className="text-gray-500">UA:</span> {md.userAgent || '—'}</div>
                <div><span className="text-gray-500">Platform:</span> {md.platform || '—'}</div>
                <div><span className="text-gray-500">Language:</span> {md.language || '—'}</div>
                <div><span className="text-gray-500">Timezone:</span> {md.timezone || '—'}</div>
                {md.screen?.width ? <div><span className="text-gray-500">Screen:</span> {md.screen.width}×{md.screen.height}</div> : null}
                {md.referrer ? <div className="break-words"><span className="text-gray-500">Referrer:</span> {md.referrer}</div> : null}
                {md.country ? <div><span className="text-gray-500">Country:</span> {md.country}</div> : null}
              </CardContent>
            </Card>
          )}

          {ticket.submitterUser && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Account</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1 text-gray-700">
                <div><span className="text-gray-500">Coins:</span> {ticket.submitterUser.coins ?? '—'}</div>
                <div><span className="text-gray-500">Rubies:</span> {ticket.submitterUser.rubies ?? '—'}</div>
                <div><span className="text-gray-500">Role:</span> {ticket.submitterUser.role || '—'}</div>
                {ticket.submitterUser.createdAt && (
                  <div><span className="text-gray-500">Joined:</span> {new Date(ticket.submitterUser.createdAt).toLocaleDateString()}</div>
                )}
              </CardContent>
            </Card>
          )}

          {Array.isArray(ticket.otherTicketsForEmail) && ticket.otherTicketsForEmail.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Other tickets from this email</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {ticket.otherTicketsForEmail.map((ot) => {
                  const sm = statusMeta(ot.status);
                  return (
                    <Link
                      key={ot._id}
                      to={`/support/${ot._id}`}
                      className="block text-xs hover:bg-gray-50 rounded p-2 border border-gray-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-gray-500">{ot.ticketNumber}</span>
                        <span className={`rounded px-1.5 py-0.5 ${toneClasses(sm.tone)}`}>{sm.label}</span>
                      </div>
                      <div className="mt-1 truncate">{ot.subject}</div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportTicketDetail;
