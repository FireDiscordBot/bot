export interface Video {
  kind: string;
  etag: string;
  items?: VideoItem[];
  pageInfo: PageInfo;
}

export interface VideoItem {
  kind: string;
  etag: string;
  id: string;
  snippet?: VideoSnippet;
  contentDetails?: ContentDetails;
  statistics?: VideoStatistics;
  liveStreamingDetails?: LiveStreamingDetails;
}

export interface ContentDetails {
  duration?: string;
  dimension?: string;
  definition?: string;
  caption?: string;
  licensedContent?: boolean;
  regionRestriction?: RegionRestriction;
  projection?: string;
}

export interface RegionRestriction {
  allowed: string[];
}

export interface VideoSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description?: string;
  thumbnails?: Thumbnails;
  channelTitle: string;
  tags?: string[];
  categoryId?: string;
  liveBroadcastContent?: string;
  localized?: VideoLocalized;
  defaultAudioLanguage?: string;
}

export interface VideoLocalized {
  title: string;
  description: string;
}

export interface Thumbnails {
  default: Thumbnail;
  medium?: Thumbnail;
  high?: Thumbnail;
  standard?: Thumbnail;
  maxres?: Thumbnail;
}

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export interface VideoStatistics {
  viewCount: string;
  likeCount: string;
  dislikeCount: string;
  favoriteCount: string;
  commentCount: string;
}

export interface LiveStreamingDetails {
  scheduledStartTime: string;
  activeLiveChatId: string;
}

export interface Channel {
  kind: string;
  etag: string;
  pageInfo: PageInfo;
  items: ChannelItem[];
}

export interface ChannelItem {
  kind: string;
  etag: string;
  id: string;
  snippet: ChannelSnippet;
  statistics: ChannelStatistics;
}

export interface ChannelSnippet {
  title: string;
  description: string;
  customUrl: string;
  publishedAt: string;
  thumbnails: Thumbnails;
  localized: ChannelLocalized;
  country: string;
}

export interface ChannelLocalized {
  title: string;
  description: string;
}

export interface ChannelStatistics {
  viewCount: string;
  subscriberCount: string;
  hiddenSubscriberCount: boolean;
  videoCount: string;
}

export interface PageInfo {
  totalResults: number;
  resultsPerPage: number;
}
