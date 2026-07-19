import { useState, useEffect } from 'react';
import { ExternalLink, Eye, Lock, Flame, Star, Search, Filter, TrendingUp, Clock, Flag } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ReportOverlay } from '../../components/links/ReportOverlay';
import { useAuth } from '../../hooks/useAuth';
import { useClipboard } from '../../hooks/useClipboard';
import api from '../../services/api';
import { APP_BASE_URL } from '../../config/appUrl';
import toast from 'react-hot-toast';

export default function Browse() {
  const { user } = useAuth();
  const { copy } = useClipboard();
  const [allLinks, setAllLinks] = useState([]);
  const [myLinks, setMyLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent, popular, trending

  useEffect(() => {
    fetchAllLinks();
  }, []);

  const fetchAllLinks = async () => {
    try {
      setLoading(true);
      
      // Fetch all public links
      console.log('🔍 Fetching public links...');
      const allResponse = await api.get('/links/public');
      const allLinksData = allResponse.data;
      
      console.log('📦 Received links:', allLinksData.length);
      console.log('📦 Sample link:', allLinksData[0]);

      // Separate user's own links
      if (user) {
        const userEmail = user.email;
        console.log('👤 Current user email:', userEmail);
        const mine = allLinksData.filter(link => link.ownerEmail === userEmail);
        const others = allLinksData.filter(link => link.ownerEmail !== userEmail);
        
        console.log('✅ My links:', mine.length);
        console.log('👥 Other links:', others.length);
        
        setMyLinks(mine);
        setAllLinks(others);
      } else {
        console.log('⚠️ No user logged in');
        setAllLinks(allLinksData);
        setMyLinks([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch links:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to load links: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (slug) => {
    const url = `${APP_BASE_URL}/${slug}`;
    copy(url);
    toast.success('Link copied!');
  };

  const sortLinks = (links) => {
    const filtered = links.filter(link => 
      (searchTerm === '' || 
       link.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       link.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       link.targetUrl?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    switch (sortBy) {
      case 'popular':
        return [...filtered].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
      case 'trending':
        // Simple trending: high clicks + recent
        return [...filtered].sort((a, b) => {
          const scoreA = (a.clicks || 0) / (Date.now() - new Date(a.createdAt).getTime());
          const scoreB = (b.clicks || 0) / (Date.now() - new Date(b.createdAt).getTime());
          return scoreB - scoreA;
        });
      case 'recent':
      default:
        return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  const LinkItem = ({ link, isOwn = false }) => {
    const shortUrl = `${APP_BASE_URL}/${link.slug}`;
    
    return (
      <Card className={`p-5 hover:border-emerald-500/50 transition-all ${isOwn ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4 flex-1 min-w-0">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
              isOwn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-600 dark:text-slate-400'
            }`}>
              <ExternalLink className="w-6 h-6" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-slate-900 dark:text-white font-semibold truncate">
                  {link.title || 'Untitled Link'}
                </h3>
                {isOwn && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                    Your Link
                  </Badge>
                )}
              </div>

              <a 
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-mono text-sm flex items-center gap-1 w-fit mb-2"
              >
                /{link.slug}
                <ExternalLink className="w-3 h-3" />
              </a>

              <p className="text-slate-600 dark:text-slate-400 text-sm truncate mb-3">
                {link.targetUrl}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {link.password && (
                  <Badge className="bg-green-500/20 text-green-400 text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    Password
                  </Badge>
                )}
                {link.showPreview && (
                  <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Badge>
                )}
                {(link.isOneTime || link.maxClicks > 0) && (
                  <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                    <Flame className="w-3 h-3 mr-1" />
                    Burn-on-open
                  </Badge>
                )}
                <Badge className="bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs">
                  {link.clicks || 0} clicks
                </Badge>
              </div>

              {/* Owner info */}
              {link.ownerEmail && !isOwn && (
                <p className="text-slate-500 text-xs mt-2">
                  Shared by {link.ownerEmail}
                </p>
              )}

              <p className="text-slate-500 text-xs mt-1">
                Created {new Date(link.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              onClick={() => handleCopyLink(link.slug)}
              size="sm"
              variant="outline"
              className="border-slate-300 dark:border-slate-700"
            >
              Copy
            </Button>
            {!isOwn && (
              <ReportOverlay 
                linkId={link._id} 
                linkSlug={link.slug}
                onReported={fetchAllLinks}
              />
            )}
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading community links...</p>
        </div>
      </div>
    );
  }

  const sortedAllLinks = sortLinks(allLinks);
  const sortedMyLinks = sortLinks(myLinks);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">Browse Community</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Discover and explore links shared by the community
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search links by title, slug, or URL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setSortBy('recent')}
                variant={sortBy === 'recent' ? 'primary' : 'outline'}
                size="sm"
                className={sortBy === 'recent' ? '' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'}
              >
                <Clock className="w-3 h-3 mr-1" />
                Recent
              </Button>
              <Button
                onClick={() => setSortBy('popular')}
                variant={sortBy === 'popular' ? 'primary' : 'outline'}
                size="sm"
                className={sortBy === 'popular' ? '' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'}
              >
                <Star className="w-3 h-3 mr-1" />
                Popular
              </Button>
              <Button
                onClick={() => setSortBy('trending')}
                variant={sortBy === 'trending' ? 'primary' : 'outline'}
                size="sm"
                className={sortBy === 'trending' ? '' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'}
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                Trending
              </Button>
            </div>
          </div>
      </Card>

      {/* User's Own Links Section */}
      {user && sortedMyLinks.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Your Links</h2>
            <Badge className="bg-emerald-500/20 text-emerald-400">
              {sortedMyLinks.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {sortedMyLinks.map(link => (
              <LinkItem key={link._id} link={link} isOwn={true} />
            ))}
          </div>
        </div>
      )}

      {/* All Community Links Section */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Community Links</h2>
          <Badge className="bg-emerald-500/20 text-emerald-400">
            {sortedAllLinks.length}
          </Badge>
        </div>

        {sortedAllLinks.length === 0 ? (
          <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-12 text-center">
            <ExternalLink className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              {searchTerm ? 'No links match your search' : 'No community links yet'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedAllLinks.map(link => (
              <LinkItem key={link._id} link={link} isOwn={false} />
            ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <Card className="bg-emerald-900/20 border-emerald-800/50 p-6">
        <div className="flex items-start gap-4">
          <Flag className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
          <div>
            <h3 className="text-slate-900 dark:text-white font-semibold mb-2">Help Keep the Community Safe</h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              If you encounter any suspicious, harmful, or inappropriate links, please use the "Report" button. 
              Our moderation team reviews all reports to maintain a safe environment for everyone.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
