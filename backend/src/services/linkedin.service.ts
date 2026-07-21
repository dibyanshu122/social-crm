import axios from 'axios';

export class LinkedinService {
  private accessToken: string;
  private isConfigured: boolean;

  constructor(accessToken?: string) {
    if (accessToken) {
      this.accessToken = accessToken;
      this.isConfigured = true;
    } else {
      this.accessToken = '';
      this.isConfigured = false;
      console.warn('LinkedIn Service initialized without an access token. Running in mock mode.');
    }
  }

  async publishPost(personUrn: string, content: string, mediaUrls: string[]): Promise<any> {
    if (!this.isConfigured) {
      console.log(`[MOCK LINKEDIN] Posting for ${personUrn}: ${content}`);
      return { id: 'mock_linkedin_post_id_' + Date.now(), success: true };
    }

    try {
      // For now, we support text-based publishing via UGC Posts API
      // To post to a company page, personUrn would be replaced by urn:li:organization:{id}
      // and we would need the Community Management API permissions.
      
      const hasMedia = mediaUrls && mediaUrls.length > 0;
      
      const shareContent: any = {
        shareCommentary: {
          text: content
        },
        shareMediaCategory: hasMedia ? 'ARTICLE' : 'NONE'
      };

      if (hasMedia) {
        let originalUrl = mediaUrls[0];
        if (originalUrl.includes('localhost') || originalUrl.includes('127.0.0.1') || originalUrl.includes('ngrok-free.dev')) {
          console.log('[LinkedIn Service] Ngrok/Localhost image detected. Swapping with public CDN image for LinkedIn crawlers.');
          originalUrl = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800'; // Beautiful gradient
        }
        shareContent.media = [
          {
            status: 'READY',
            description: {
              text: 'Post Image'
            },
            originalUrl: originalUrl,
            title: {
              text: 'Shared Image'
            }
          }
        ];
      }

      const payload = {
        author: `urn:li:person:${personUrn}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': shareContent
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      console.log(`Successfully posted to LinkedIn for ${personUrn}`);
      return response.data;
    } catch (error: any) {
      console.error('Error publishing to LinkedIn:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to publish to LinkedIn');
    }
  }
}
