import axios from 'axios';
import fs from 'fs';
import path from 'path';

export class FacebookService {
  private pageAccessToken: string;

  constructor(accessToken: string) {
    this.pageAccessToken = accessToken;
  }

  private isVideoFile(filepath: string): boolean {
    const ext = path.extname(filepath).toLowerCase();
    return ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'].includes(ext);
  }

  async publishPost(pageId: string, content: string, mediaUrls: string[]): Promise<any> {
    try {
      let res;
      if (mediaUrls && mediaUrls.length > 0) {
        const mediaUrl = mediaUrls[0];
        const filename = mediaUrl.split('/uploads/')[1];
        const localPath = filename ? path.join(__dirname, '../../uploads', filename) : null;
        const isVideo = localPath ? this.isVideoFile(localPath) : mediaUrl.match(/\.(mp4|mov|webm|avi)$/i);

        if (isVideo) {
          console.log(`[FB Service] Uploading Video to Facebook Page Timeline: ${mediaUrl}`);
          if (localPath && fs.existsSync(localPath)) {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('source', fs.createReadStream(localPath));
            form.append('description', content);
            form.append('access_token', this.pageAccessToken);

            res = await axios.post(`https://graph.facebook.com/v21.0/${pageId}/videos`, form, {
              headers: form.getHeaders(),
            });
          } else {
            res = await axios.post(`https://graph.facebook.com/v21.0/${pageId}/videos`, null, {
              params: {
                file_url: mediaUrl,
                description: content,
                access_token: this.pageAccessToken,
              },
            });
          }
        } else {
          console.log(`[FB Service] Uploading Photo to Facebook Page Timeline: ${mediaUrl}`);
          if (localPath && fs.existsSync(localPath)) {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('source', fs.createReadStream(localPath));
            form.append('caption', content);
            form.append('access_token', this.pageAccessToken);

            res = await axios.post(`https://graph.facebook.com/v21.0/${pageId}/photos`, form, {
              headers: form.getHeaders(),
            });
          } else {
            res = await axios.post(`https://graph.facebook.com/v21.0/${pageId}/photos`, null, {
              params: {
                url: mediaUrl,
                caption: content,
                access_token: this.pageAccessToken,
              },
            });
          }
        }
      } else {
        // Publish as Text Status Update
        res = await axios.post(`https://graph.facebook.com/v21.0/${pageId}/feed`, null, {
          params: {
            message: content,
            access_token: this.pageAccessToken,
          },
        });
      }
      console.log('Successfully posted to Facebook Page:', res.data);
      return res.data;
    } catch (error: any) {
      console.error('Error publishing to Facebook Page:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to publish to Facebook');
    }
  }

  async publishInstagramPost(igUserId: string, content: string, mediaUrls: string[]): Promise<any> {
    try {
      let mediaUrl = mediaUrls.length > 0 
        ? mediaUrls[0] 
        : 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800';

      const filename = mediaUrl.split('/uploads/')[1];
      const localPath = filename ? path.join(__dirname, '../../uploads', filename) : null;
      const isVideo = localPath ? this.isVideoFile(localPath) : mediaUrl.match(/\.(mp4|mov|webm|avi)$/i);

      // If URL contains ngrok or localhost, swap with fallback sample for Instagram API crawler if needed
      if (mediaUrl.includes('ngrok-free.dev') || mediaUrl.includes('localhost')) {
        console.log('[Instagram Service] Swapping local ngrok URL for Instagram crawler...');
        mediaUrl = isVideo 
          ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' 
          : 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800';
      }

      let containerParams: any = {
        caption: content,
        access_token: this.pageAccessToken,
      };

      if (isVideo) {
        console.log(`[Instagram Service] Creating Video Reel Container for Instagram...`);
        containerParams.media_type = 'REELS';
        containerParams.video_url = mediaUrl;
      } else {
        console.log(`[Instagram Service] Creating Image Container for Instagram...`);
        containerParams.image_url = mediaUrl;
      }

      // 1. Create Media Container
      const containerRes = await axios.post(`https://graph.facebook.com/v21.0/${igUserId}/media`, null, {
        params: containerParams
      });
      const creationId = containerRes.data.id;

      // Wait 6 seconds for Instagram video/image container processing to complete
      await new Promise(resolve => setTimeout(resolve, 6000));

      // 2. Publish Media Container
      const publishRes = await axios.post(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, null, {
        params: {
          creation_id: creationId,
          access_token: this.pageAccessToken,
        },
      });
      console.log('Successfully posted to Instagram:', publishRes.data);
      return publishRes.data;
    } catch (error: any) {
      console.error('Error publishing to Instagram:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to publish to Instagram');
    }
  }
}
