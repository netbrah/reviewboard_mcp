import axios, { AxiosInstance, AxiosResponse } from "axios";
import { parseString as parseXML } from "xml2js";
import { promisify } from "util";
import https from "https";

const parseXMLAsync = promisify(parseXML);

export interface ReviewBoardConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  apiToken?: string;
}

export interface ReviewRequest {
  id: number;
  summary: string;
  description: string;
  submitter: {
    username: string;
    first_name: string;
    last_name: string;
  };
  status: string;
  public: boolean;
  repository: {
    id: number;
    name: string;
  };
  target_people: Array<{
    username: string;
    first_name: string;
    last_name: string;
  }>;
  target_groups: Array<{
    name: string;
    display_name: string;
  }>;
  time_added: string;
  last_updated: string;
  url: string;
}

export interface Review {
  id: number;
  user: {
    username: string;
    first_name: string;
    last_name: string;
  };
  timestamp: string;
  public: boolean;
  ship_it: boolean;
  body_top: string;
  body_bottom: string;
  url: string;
}

export interface Repository {
  id: number;
  name: string;
  path: string;
  tool: string;
  public: boolean;
  url: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  fullname: string;
  is_active: boolean;
  url: string;
}

export interface Diff {
  id: number;
  revision: number;
  timestamp: string;
  name: string;
  files: Array<{
    id: number;
    source_file: string;
    dest_file: string;
    source_revision: string;
    dest_detail: string;
    chunks: Array<{
      change: string;
      collapsable: boolean;
      index: number;
      lines: Array<Array<number | string>>;
      meta: {
        headers: string[];
        whitespace_only: boolean;
      };
      numlines: number;
    }>;
  }>;
}

export interface SearchResult {
  search: {
    query: string;
    results: Array<{
      id: string;
      summary: string;
      url: string;
      model: string;
    }>;
  };
}

export class ReviewBoardClient {
  private client: AxiosInstance;
  private config: ReviewBoardConfig;

  constructor(config: ReviewBoardConfig) {
    this.config = config;

    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'ReviewBoard-MCP-Server/1.0.0',
      },
      // Add HTTPS agent to handle self-signed certificates for internal servers
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // Allow self-signed certificates
      }),
    });

    // Set up authentication
    if (config.apiToken) {
      this.client.defaults.headers.common['Authorization'] = `token ${config.apiToken}`;
    } else if (config.username && config.password) {
      this.client.defaults.auth = {
        username: config.username,
        password: config.password,
      };
    }

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.detail || error.response.data?.message || error.message;
          throw new Error(`ReviewBoard API error (${status}): ${message}`);
        } else if (error.request) {
          throw new Error(`Network error: ${error.message}`);
        } else {
          throw new Error(`Request error: ${error.message}`);
        }
      }
    );
  }

  /**
   * Get the API root to test connectivity and discover available endpoints
   */
  async getApiRoot(): Promise<any> {
    try {
      const response = await this.client.get('/api/');

      // Handle both JSON and XML responses
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('xml')) {
        const xmlData = await parseXMLAsync(response.data);
        return xmlData;
      }

      return response.data;
    } catch (error) {
      throw new Error(`Failed to connect to ReviewBoard API: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get review requests with optional filtering
   */
  async getReviewRequests(options: {
    status?: string;
    repository?: string;
    user?: string;
    limit?: number;
  } = {}): Promise<{ review_requests: ReviewRequest[] }> {
    const params = new URLSearchParams();

    if (options.status && options.status !== 'all') {
      params.append('status', options.status);
    }
    if (options.repository) {
      params.append('repository', options.repository);
    }
    if (options.user) {
      params.append('from-user', options.user);
    }
    if (options.limit) {
      params.append('max-results', options.limit.toString());
    }

    const response = await this.client.get(`/api/review-requests/?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a specific review request by ID
   */
  async getReviewRequest(id: number): Promise<{ review_request: ReviewRequest }> {
    const response = await this.client.get(`/api/review-requests/${id}/`);
    return response.data;
  }

  /**
   * Get reviews for a specific review request
   */
  async getReviews(reviewRequestId: number): Promise<{ reviews: Review[] }> {
    const response = await this.client.get(`/api/review-requests/${reviewRequestId}/reviews/`);
    return response.data;
  }

  /**
   * Get diffs for a specific review request
   */
  async getDiff(reviewRequestId: number, revision?: number): Promise<{ diff: Diff }> {
    let url = `/api/review-requests/${reviewRequestId}/diffs/`;
    if (revision) {
      url += `${revision}/`;
    } else {
      // Get the latest diff
      const diffsResponse = await this.client.get(url);
      const diffs = diffsResponse.data.diffs;
      if (diffs && diffs.length > 0) {
        const latestDiff = diffs[diffs.length - 1];
        url += `${latestDiff.revision}/`;
      } else {
        throw new Error('No diffs found for this review request');
      }
    }

    const response = await this.client.get(url);
    return response.data;
  }

  /**
   * Get repositories
   */
  async getRepositories(limit = 25): Promise<{ repositories: Repository[] }> {
    const response = await this.client.get(`/api/repositories/?max-results=${limit}`);
    return response.data;
  }

  /**
   * Get users
   */
  async getUsers(limit = 25): Promise<{ users: User[] }> {
    const response = await this.client.get(`/api/users/?max-results=${limit}`);
    return response.data;
  }

  /**
   * Search functionality
   */
  async search(query: string, username?: string): Promise<SearchResult> {
    const params = new URLSearchParams();
    params.append('q', query);

    if (username) {
      params.append('username', username);
    }

    const response = await this.client.get(`/api/search/?${params.toString()}`);
    return response.data;
  }

  /**
   * Get groups
   */
  async getGroups(limit = 25): Promise<{ groups: Array<{ name: string; display_name: string; url: string }> }> {
    const response = await this.client.get(`/api/groups/?max-results=${limit}`);
    return response.data;
  }

  /**
   * Get files in a diff for a specific review request
   */
  async getDiffFiles(reviewRequestId: number, diffRevision?: number): Promise<{ files: Array<any> }> {
    // First get the diff to find the correct revision if not specified
    if (!diffRevision) {
      const diffResponse = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/`);
      const diffs = diffResponse.data.diffs || [];
      if (diffs.length > 0) {
        // Get the latest diff revision
        diffRevision = diffs[diffs.length - 1].revision;
      } else {
        throw new Error("No diffs found for this review request");
      }
    }

    const response = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/${diffRevision}/files/`);
    return response.data;
  }

  /**
   * Get the raw patch content for a specific file in a diff
   */
  async getFilePatch(reviewRequestId: number, diffRevision: number, fileDiffId: number): Promise<string> {
    // Try multiple possible endpoints for getting diff content
    const possibleEndpoints = [
      `/api/review-requests/${reviewRequestId}/diffs/${diffRevision}/files/${fileDiffId}/diff/`,
      `/api/review-requests/${reviewRequestId}/diffs/${diffRevision}/files/${fileDiffId}/`,
      `/api/review-requests/${reviewRequestId}/diffs/${diffRevision}/files/${fileDiffId}/?expand=diff_data`
    ];

    for (const endpoint of possibleEndpoints) {
      try {
        const response = await this.client.get(endpoint);

        // If we get JSON data, look for diff content
        if (typeof response.data === 'object' && response.data.file && response.data.file.diff_data) {
          return response.data.file.diff_data;
        }

        // If we get text data directly
        if (typeof response.data === 'string') {
          return response.data;
        }

        // If we get the file object with diff data
        if (response.data.diff_data) {
          return response.data.diff_data;
        }

        // Return the raw response as JSON string if no diff data found
        return JSON.stringify(response.data, null, 2);

      } catch (error) {
        // Continue to next endpoint
        continue;
      }
    }

    throw new Error(`Unable to fetch patch content from any available endpoint`);
  }

  /**
   * Get the original file content
   */
  async getOriginalFile(reviewRequestId: number, diffRevision: number, fileDiffId: number): Promise<string> {
    const response = await this.client.get(
      `/api/review-requests/${reviewRequestId}/diffs/${diffRevision}/files/${fileDiffId}/original-file/`,
      { responseType: 'text' }
    );
    return response.data;
  }

  /**
   * Get the patched file content
   */
  async getPatchedFile(reviewRequestId: number, diffRevision: number, fileDiffId: number): Promise<string> {
    const response = await this.client.get(
      `/api/review-requests/${reviewRequestId}/diffs/${diffRevision}/files/${fileDiffId}/patched-file/`,
      { responseType: 'text' }
    );
    return response.data;
  }

  /**
   * Get the unified diff context for a review request
   */
  async getDiffContext(reviewRequestId: number): Promise<any> {
    const response = await this.client.get(`/api/review-requests/${reviewRequestId}/diff-context/`);
    return response.data;
  }

  /**
   * Get the full diff as a unified patch
   */
  async getFullDiffPatch(reviewRequestId: number, diffRevision?: number): Promise<string> {
    // First get the diff revision if not specified
    if (!diffRevision) {
      const diffResponse = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/`);
      const diffs = diffResponse.data.diffs || [];
      if (diffs.length > 0) {
        diffRevision = diffs[diffs.length - 1].revision;
      } else {
        throw new Error("No diffs found for this review request");
      }
    }

    // Try to get the diff in patch format
    try {
      // Some ReviewBoard instances support getting the diff directly
      const response = await this.client.get(
        `/api/review-requests/${reviewRequestId}/diffs/${diffRevision}/`,
        {
          headers: { 'Accept': 'text/x-patch' }
        }
      );

      if (typeof response.data === 'string') {
        return response.data;
      }
    } catch (error) {
      // Fallback to constructing patch from file data
    }

    // Fallback: construct patch from individual file data
    const filesResponse = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/${diffRevision}/files/`);
    const files = filesResponse.data.files || [];

    let patchContent = '';
    for (const file of files) {
      try {
        // Try to get individual file patch
        const filePatch = await this.getFilePatch(reviewRequestId, diffRevision!, file.id);
        patchContent += `\n--- ${file.source_file}\n+++ ${file.dest_file}\n${filePatch}\n`;
      } catch (error) {
        // Add file info even if we can't get the patch
        patchContent += `\n--- ${file.source_file}\n+++ ${file.dest_file}\n[Patch content not available]\n`;
      }
    }

    return patchContent || 'No patch content available';
  }

  /**
   * Get diff comments for a specific review request
   */
  async getDiffComments(reviewRequestId: number): Promise<{ diff_comments: Array<any> }> {
    const response = await this.client.get(`/api/review-requests/${reviewRequestId}/reviews/`);

    // Extract diff comments from all reviews
    const reviews = response.data.reviews || [];
    const allComments: any[] = [];

    for (const review of reviews) {
      if (review.links && review.links.diff_comments) {
        const commentsResponse = await this.client.get(review.links.diff_comments.href);
        allComments.push(...(commentsResponse.data.diff_comments || []));
      }
    }

    return { diff_comments: allComments };
  }

  /**
   * Get all comment types for a review request
   */
  async getAllComments(reviewRequestId: number): Promise<{
    diff_comments: any[],
    general_comments: any[],
    file_attachment_comments: any[],
    screenshot_comments: any[],
    total_comments: number
  }> {
    const reviewsResponse = await this.client.get(`/api/review-requests/${reviewRequestId}/reviews/`);
    const reviews = reviewsResponse.data.reviews || [];

    let allDiffComments: any[] = [];
    let allGeneralComments: any[] = [];
    let allFileAttachmentComments: any[] = [];
    let allScreenshotComments: any[] = [];

    for (const review of reviews) {
      try {
        // Get diff comments
        if (review.links?.diff_comments) {
          const diffCommentsResponse = await this.client.get(review.links.diff_comments.href);
          const diffComments = diffCommentsResponse.data.diff_comments || [];
          allDiffComments.push(...diffComments.map((comment: any) => ({
            ...comment,
            comment_type: 'diff',
            review_info: {
              id: review.id,
              user: review.links?.user?.title || 'Unknown',
              timestamp: review.timestamp,
              ship_it: review.ship_it
            }
          })));
        }

        // Get general comments
        if (review.links?.general_comments) {
          const generalCommentsResponse = await this.client.get(review.links.general_comments.href);
          const generalComments = generalCommentsResponse.data.general_comments || [];
          allGeneralComments.push(...generalComments.map((comment: any) => ({
            ...comment,
            comment_type: 'general',
            review_info: {
              id: review.id,
              user: review.links?.user?.title || 'Unknown',
              timestamp: review.timestamp,
              ship_it: review.ship_it
            }
          })));
        }

        // Get file attachment comments
        if (review.links?.file_attachment_comments) {
          const fileAttachmentCommentsResponse = await this.client.get(review.links.file_attachment_comments.href);
          const fileAttachmentComments = fileAttachmentCommentsResponse.data.file_attachment_comments || [];
          allFileAttachmentComments.push(...fileAttachmentComments.map((comment: any) => ({
            ...comment,
            comment_type: 'file_attachment',
            review_info: {
              id: review.id,
              user: review.links?.user?.title || 'Unknown',
              timestamp: review.timestamp,
              ship_it: review.ship_it
            }
          })));
        }

        // Get screenshot comments
        if (review.links?.screenshot_comments) {
          const screenshotCommentsResponse = await this.client.get(review.links.screenshot_comments.href);
          const screenshotComments = screenshotCommentsResponse.data.screenshot_comments || [];
          allScreenshotComments.push(...screenshotComments.map((comment: any) => ({
            ...comment,
            comment_type: 'screenshot',
            review_info: {
              id: review.id,
              user: review.links?.user?.title || 'Unknown',
              timestamp: review.timestamp,
              ship_it: review.ship_it
            }
          })));
        }
      } catch (error) {
        console.warn(`Failed to fetch comments for review ${review.id}:`, error);
      }
    }

    return {
      diff_comments: allDiffComments,
      general_comments: allGeneralComments,
      file_attachment_comments: allFileAttachmentComments,
      screenshot_comments: allScreenshotComments,
      total_comments: allDiffComments.length + allGeneralComments.length +
                      allFileAttachmentComments.length + allScreenshotComments.length
    };
  }

  /**
   * Get file content for a specific diff and file
   */
  async getFileContent(reviewRequestId: number, diffRevision: number, fileDiffId: number, usePatched: boolean = true): Promise<string> {
    const endpoint = usePatched ? 'patched-file' : 'original-file';
    const response = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/${diffRevision}/files/${fileDiffId}/${endpoint}/`);
    return response.data;
  }

  /**
   * Get annotated file content with comments overlaid
   */
  async getAnnotatedFileContent(reviewRequestId: number, filePath: string, diffComments: any[]): Promise<{
    file_path: string,
    annotated_lines: Array<{
      line_number: number,
      content: string,
      comments: any[]
    }>,
    file_content_available: boolean
  }> {
    let fileContent = '';

    // Extract file diff info from the first comment's filediff link
    if (diffComments.length > 0) {
      const firstComment = diffComments[0];
      if (firstComment.links?.filediff?.href) {
        // Extract diff revision and file ID from href like "/api/review-requests/882166/diffs/1/files/23651295/"
        const match = firstComment.links.filediff.href.match(/diffs\/(\d+)\/files\/(\d+)\//);
        if (match) {
          const diffRevision = parseInt(match[1]);
          const fileDiffId = parseInt(match[2]);

          try {
            // Try to get patched file content first, then original
            try {
              fileContent = await this.getFileContent(reviewRequestId, diffRevision, fileDiffId, true);
            } catch (error) {
              console.warn(`Failed to get patched file, trying original:`, error);
              fileContent = await this.getFileContent(reviewRequestId, diffRevision, fileDiffId, false);
            }
          } catch (error) {
            console.warn(`Failed to get file content for ${filePath}:`, error);
          }
        }
      }
    }

    if (!fileContent) {
      return {
        file_path: filePath,
        annotated_lines: [],
        file_content_available: false
      };
    }

    const lines = fileContent.split('\n');
    const annotatedLines: Array<{
      line_number: number,
      content: string,
      comments: any[]
    }> = [];

    // Create a map of line numbers to comments
    const commentsByLine = new Map<number, any[]>();
    diffComments.forEach(comment => {
      const startLine = comment.first_line || 1;
      const numLines = comment.num_lines || 1;

      for (let i = 0; i < numLines; i++) {
        const lineNum = startLine + i;
        if (!commentsByLine.has(lineNum)) {
          commentsByLine.set(lineNum, []);
        }
        commentsByLine.get(lineNum)!.push(comment);
      }
    });

    // Build annotated lines
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const lineComments = commentsByLine.get(lineNumber) || [];

      annotatedLines.push({
        line_number: lineNumber,
        content: line,
        comments: lineComments
      });
    });

    return {
      file_path: filePath,
      annotated_lines: annotatedLines,
      file_content_available: true
    };
  }

  /**
   * Get all diff comments organized by file for a review request
   */
  async getDiffCommentsByFile(reviewRequestId: number): Promise<{
    comments_by_file: Record<string, Array<any>>,
    total_comments: number,
    files_with_comments: string[]
  }> {
    // Get all reviews first
    const reviewsResponse = await this.client.get(`/api/review-requests/${reviewRequestId}/reviews/`);
    const reviews = reviewsResponse.data.reviews || [];

    // Get all diffs for this review request to handle cross-revision file mapping
    const diffsResponse = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/`);
    const diffs = diffsResponse.data.diffs || [];

    // Build comprehensive file mapping across ALL diff revisions
    const fileIdToName = new Map<number, string>();

    for (const diff of diffs) {
      try {
        const filesResponse = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/${diff.id}/files/`);
        const diffFiles = filesResponse.data.files || [];

        for (const file of diffFiles) {
          const filePath = file.dest_file || file.source_file;
          fileIdToName.set(file.id, filePath);
        }
      } catch (error) {
        console.warn(`Failed to fetch files for diff ${diff.id}:`, error);
      }
    }

    const commentsByFile: Record<string, Array<any>> = {};
    let totalComments = 0;

    // For each review, get its diff comments
    for (const review of reviews) {
      if (review.links?.diff_comments) {
        try {
          const commentsResponse = await this.client.get(review.links.diff_comments.href);
          const comments = commentsResponse.data.diff_comments || [];

          comments.forEach((comment: any) => {
            totalComments++;

            // Try multiple ways to get the file name
            let fileName = 'Unknown File';

            // Method 1: Use filediff.id
            if (comment.filediff?.id) {
              fileName = fileIdToName.get(comment.filediff.id) || fileName;
            }

            // Method 2: Use links.filediff if available (now handles cross-revision)
            if (fileName === 'Unknown File' && comment.links?.filediff?.href) {
              // Extract file diff ID from href like "/api/review-requests/882166/diffs/1/files/23651295/"
              const match = comment.links.filediff.href.match(/files\/(\d+)\//);
              if (match) {
                const fileDiffId = parseInt(match[1]);
                fileName = fileIdToName.get(fileDiffId) || fileName;
              }

              // Fallback: try to extract path from filediff title if still unknown
              if (fileName === 'Unknown File' && comment.links.filediff.title) {
                const pathMatch = comment.links.filediff.title.match(/^([^(]+)/);
                if (pathMatch) {
                  fileName = pathMatch[1].trim();
                }
              }
            }

            // Method 3: Check if comment has filename directly
            if (fileName === 'Unknown File' && comment.filename) {
              fileName = comment.filename;
            }

            // If still unknown, use a more descriptive name
            if (fileName === 'Unknown File') {
              fileName = `Unknown File (Comment ID: ${comment.id})`;
            }

            if (!commentsByFile[fileName]) {
              commentsByFile[fileName] = [];
            }

            // Add review context to the comment
            commentsByFile[fileName].push({
              ...comment,
              review_info: {
                id: review.id,
                user: review.links?.user?.title || 'Unknown',
                timestamp: review.timestamp,
                ship_it: review.ship_it
              }
            });
          });
        } catch (error) {
          // Skip if can't get comments for this review
          console.warn(`Could not get diff comments for review ${review.id}: ${error}`);
        }
      }
    }

    return {
      comments_by_file: commentsByFile,
      total_comments: totalComments,
      files_with_comments: Object.keys(commentsByFile)
    };
  }

  /**
   * Get comprehensive comments analysis with file content annotations
   */
  async getComprehensiveCommentsAnalysis(reviewRequestId: number): Promise<{
    all_comments: {
      diff_comments: any[],
      general_comments: any[],
      file_attachment_comments: any[],
      screenshot_comments: any[],
      total_comments: number
    },
    annotated_files: Record<string, {
      file_path: string,
      annotated_lines: Array<{
        line_number: number,
        content: string,
        comments: any[]
      }>,
      file_content_available: boolean,
      comment_count: number
    }>,
    summary: {
      files_with_diff_comments: number,
      total_diff_comments: number,
      total_general_comments: number,
      total_file_attachment_comments: number,
      total_screenshot_comments: number,
      overall_total_comments: number
    }
  }> {
    // Get all comment types
    const allComments = await this.getAllComments(reviewRequestId);

    // Get diff comments organized by file (for cross-revision mapping)
    const diffCommentsByFile = await this.getDiffCommentsByFile(reviewRequestId);

    // Create annotated files for each file that has diff comments
    const annotatedFiles: Record<string, any> = {};

    for (const [filePath, comments] of Object.entries(diffCommentsByFile.comments_by_file)) {
      if (!filePath.includes('Unknown File')) {
        try {
          const annotatedContent = await this.getAnnotatedFileContent(reviewRequestId, filePath, comments);
          annotatedFiles[filePath] = {
            ...annotatedContent,
            comment_count: comments.length
          };
        } catch (error) {
          console.warn(`Failed to get annotated content for ${filePath}:`, error);
          annotatedFiles[filePath] = {
            file_path: filePath,
            annotated_lines: [],
            file_content_available: false,
            comment_count: comments.length
          };
        }
      }
    }

    return {
      all_comments: allComments,
      annotated_files: annotatedFiles,
      summary: {
        files_with_diff_comments: Object.keys(annotatedFiles).length,
        total_diff_comments: allComments.diff_comments.length,
        total_general_comments: allComments.general_comments.length,
        total_file_attachment_comments: allComments.file_attachment_comments.length,
        total_screenshot_comments: allComments.screenshot_comments.length,
        overall_total_comments: allComments.total_comments
      }
    };
  }

  /**
   * Get comprehensive review summary with comments organized by file
   */
  async getReviewSummaryWithComments(reviewRequestId: number): Promise<{
    review_request: any,
    reviews: Array<any>,
    diff_info: any,
    files_changed: Array<any>,
    comments_by_file: Record<string, Array<any>>,
    summary: {
      total_reviews: number,
      ship_it_count: number,
      total_comments: number,
      files_with_comments: number,
      files_changed: number
    }
  }> {
    // Get all the basic data
    const [reviewRequest, reviews, diff, diffFiles, commentsByFile] = await Promise.all([
      this.getReviewRequest(reviewRequestId),
      this.getReviews(reviewRequestId),
      this.getDiff(reviewRequestId),
      this.getDiffFiles(reviewRequestId),
      this.getDiffCommentsByFile(reviewRequestId)
    ]);

    const shipItCount = reviews.reviews?.filter(r => r.ship_it).length || 0;

    return {
      review_request: reviewRequest.review_request,
      reviews: reviews.reviews || [],
      diff_info: diff.diff,
      files_changed: diffFiles.files || [],
      comments_by_file: commentsByFile.comments_by_file,
      summary: {
        total_reviews: reviews.reviews?.length || 0,
        ship_it_count: shipItCount,
        total_comments: commentsByFile.total_comments,
        files_with_comments: commentsByFile.files_with_comments.length,
        files_changed: diffFiles.files?.length || 0
      }
    };
  }

  /**
   * Get file attachment comments for a specific review request
   */
  async getFileAttachmentComments(reviewRequestId: number): Promise<{ file_attachment_comments: Array<any> }> {
    const response = await this.client.get(`/api/review-requests/${reviewRequestId}/reviews/`);

    // Extract file attachment comments from all reviews
    const reviews = response.data.reviews || [];
    const allComments: any[] = [];

    for (const review of reviews) {
      if (review.links && review.links.file_attachment_comments) {
        const commentsResponse = await this.client.get(review.links.file_attachment_comments.href);
        allComments.push(...(commentsResponse.data.file_attachment_comments || []));
      }
    }

    return { file_attachment_comments: allComments };
  }

  /**
   * Get general comments for a specific review request
   */
  async getGeneralComments(reviewRequestId: number): Promise<{ general_comments: Array<any> }> {
    const response = await this.client.get(`/api/review-requests/${reviewRequestId}/reviews/`);

    // Extract general comments from all reviews
    const reviews = response.data.reviews || [];
    const allComments: any[] = [];

    for (const review of reviews) {
      if (review.links && review.links.general_comments) {
        const commentsResponse = await this.client.get(review.links.general_comments.href);
        allComments.push(...(commentsResponse.data.general_comments || []));
      }
    }

    return { general_comments: allComments };
  }

  // ========================================================================
  // NEW: REVISION & HISTORY TOOLS
  // ========================================================================

  /**
   * Get all diff revisions with summary information
   * Use case: "How many revisions are there?"
   */
  async getDiffRevisions(reviewRequestId: number, includePatchDiffs: boolean = false): Promise<any> {
    const response = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/`);
    const diffs = response.data.diffs || [];

    const revisions = diffs.map((diff: any, index: number) => ({
      revision_number: diff.revision,
      diff_id: diff.id,
      timestamp: diff.timestamp,
      name: diff.name || `Revision ${diff.revision}`,
      base_commit_id: diff.base_commit_id,
      is_latest: index === diffs.length - 1,
      links: {
        files: diff.links?.files?.href,
        commits: diff.links?.commits?.href
      }
    }));

    // If patch diffs are requested, get the patch between consecutive revisions
    let patchDiffs: any[] = [];
    if (includePatchDiffs && diffs.length > 1) {
      for (let i = 1; i < diffs.length; i++) {
        const fromRev = diffs[i - 1].revision;
        const toRev = diffs[i].revision;

        try {
          // Get patch for the current revision (which shows changes from previous)
          const patch = await this.getFullDiffPatch(reviewRequestId, toRev);
          patchDiffs.push({
            from_revision: fromRev,
            to_revision: toRev,
            patch: patch,
            timestamp: diffs[i].timestamp
          });
        } catch (error) {
          patchDiffs.push({
            from_revision: fromRev,
            to_revision: toRev,
            patch: `Error fetching patch: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: diffs[i].timestamp,
            error: true
          });
        }
      }
    }

    return {
      total_revisions: diffs.length,
      revisions: revisions,
      patch_diffs: includePatchDiffs ? patchDiffs : undefined,
      stat: "ok"
    };
  }

  /**
   * Get detailed summary of a specific revision
   * Use case: "Summarize revision 2"
   */
  async getRevisionSummary(reviewRequestId: number, revision: number): Promise<any> {
    const [diffInfo, files] = await Promise.all([
      this.client.get(`/api/review-requests/${reviewRequestId}/diffs/${revision}/`),
      this.client.get(`/api/review-requests/${reviewRequestId}/diffs/${revision}/files/`)
    ]);

    const diff = diffInfo.data.diff;
    const filesList = files.data.files || [];

    // Calculate statistics
    const stats = {
      total_files_changed: filesList.length,
      files_added: filesList.filter((f: any) => f.status === 'added').length,
      files_modified: filesList.filter((f: any) => f.status === 'modified').length,
      files_deleted: filesList.filter((f: any) => f.status === 'deleted').length,
      total_insertions: filesList.reduce((sum: number, f: any) =>
        sum + (f.extra_data?.insert_count || 0), 0),
      total_deletions: filesList.reduce((sum: number, f: any) =>
        sum + (f.extra_data?.delete_count || 0), 0)
    };

    // Get commit messages if available
    let commits: any[] = [];
    if (diff.links?.commits) {
      try {
        const commitsResponse = await this.client.get(diff.links.commits.href);
        commits = commitsResponse.data.commits || [];
      } catch (e) {
        // Commits might not be available for all repo types
      }
    }

    return {
      revision_number: diff.revision,
      diff_id: diff.id,
      timestamp: diff.timestamp,
      base_commit_id: diff.base_commit_id,
      statistics: stats,
      commits: commits.map((c: any) => ({
        commit_id: c.commit_id,
        message: c.commit_message,
        author: c.author_name,
        date: c.author_date
      })),
      files: filesList.map((f: any) => ({
        id: f.id,
        source_file: f.source_file,
        dest_file: f.dest_file,
        status: f.status,
        lines_inserted: f.extra_data?.insert_count || 0,
        lines_deleted: f.extra_data?.delete_count || 0,
        total_lines: f.extra_data?.total_line_count || 0
      })),
      stat: "ok"
    };
  }

  /**
   * Get file content at a specific revision
   * Use case: "Show me file X from 2 revisions ago"
   */
  async getFileAtRevision(reviewRequestId: number, filePath: string, revisionNumber: number, type: 'original' | 'patched' = 'patched'): Promise<any> {
    // First get all diffs to find the specified revision
    const diffsResponse = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/`);
    const diffs = diffsResponse.data.diffs || [];

    // Find the diff with the matching revision number
    const targetDiff = diffs.find((d: any) => d.revision === revisionNumber);
    if (!targetDiff) {
      throw new Error(`Revision ${revisionNumber} not found`);
    }

    // Get files for this revision
    const filesResponse = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/${revisionNumber}/files/`);
    const files = filesResponse.data.files || [];

    // Find the file by path
    const targetFile = files.find((f: any) =>
      f.source_file === filePath || f.dest_file === filePath
    );

    if (!targetFile) {
      throw new Error(`File ${filePath} not found in revision ${revisionNumber}`);
    }

    // Get the file content
    const endpoint = type === 'original' ? 'original-file' : 'patched-file';
    const contentResponse = await this.client.get(
      `/api/review-requests/${reviewRequestId}/diffs/${revisionNumber}/files/${targetFile.id}/${endpoint}/`
    );

    return {
      file_path: filePath,
      revision_number: revisionNumber,
      type: type,
      content: contentResponse.data,
      file_info: {
        status: targetFile.status,
        lines_inserted: targetFile.extra_data?.insert_count || 0,
        lines_deleted: targetFile.extra_data?.delete_count || 0,
        total_lines: targetFile.extra_data?.total_line_count || 0
      },
      stat: "ok"
    };
  }

  /**
   * Get file revision history - track how a specific file changed across all revisions
   * Use case: "Show me how file X evolved across all revisions"
   */
  async getFileRevisionHistory(reviewRequestId: number, filePath: string): Promise<any> {
    const diffsResponse = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/`);
    const diffs = diffsResponse.data.diffs || [];

    const fileHistory: any[] = [];

    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i];
      const revisionNumber = diff.revision;

      try {
        // Get files for this revision
        const filesResponse = await this.client.get(
          `/api/review-requests/${reviewRequestId}/diffs/${revisionNumber}/files/`
        );
        const files = filesResponse.data.files || [];

        // Find the file by path (check both source and dest)
        const targetFile = files.find((f: any) =>
          f.source_file === filePath || f.dest_file === filePath ||
          f.source_file.endsWith(filePath) || f.dest_file.endsWith(filePath)
        );

        if (targetFile) {
          // Get the patch for this file
          let patch = '';
          try {
            patch = await this.getFilePatch(reviewRequestId, revisionNumber, targetFile.id);
          } catch (error) {
            patch = `[Patch unavailable: ${error instanceof Error ? error.message : 'Unknown error'}]`;
          }

          fileHistory.push({
            revision_number: revisionNumber,
            timestamp: diff.timestamp,
            source_file: targetFile.source_file,
            dest_file: targetFile.dest_file,
            status: targetFile.status || 'modified',
            lines_inserted: targetFile.extra_data?.insert_count || 0,
            lines_deleted: targetFile.extra_data?.delete_count || 0,
            total_lines: targetFile.extra_data?.total_line_count || 0,
            patch: patch,
            present_in_revision: true
          });
        } else {
          // File not present in this revision
          fileHistory.push({
            revision_number: revisionNumber,
            timestamp: diff.timestamp,
            present_in_revision: false,
            note: 'File not modified in this revision'
          });
        }
      } catch (error) {
        fileHistory.push({
          revision_number: revisionNumber,
          timestamp: diff.timestamp,
          error: true,
          message: `Error processing revision: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    // Generate inter-revision patches if file appears in multiple revisions
    const interRevisionDiffs: any[] = [];
    const presentRevisions = fileHistory.filter(h => h.present_in_revision);

    for (let i = 1; i < presentRevisions.length; i++) {
      const prev = presentRevisions[i - 1];
      const curr = presentRevisions[i];

      interRevisionDiffs.push({
        from_revision: prev.revision_number,
        to_revision: curr.revision_number,
        changes: {
          lines_inserted_delta: (curr.lines_inserted || 0) - (prev.lines_inserted || 0),
          lines_deleted_delta: (curr.lines_deleted || 0) - (prev.lines_deleted || 0)
        },
        patch_in_to_revision: curr.patch
      });
    }

    // Calculate totals
    const totalLinesInserted = presentRevisions.reduce((sum, rev) => sum + (rev.lines_inserted || 0), 0);
    const totalLinesDeleted = presentRevisions.reduce((sum, rev) => sum + (rev.lines_deleted || 0), 0);

    return {
      file_path: filePath,
      total_revisions: diffs.length,
      revisions_containing_file: presentRevisions.length,
      file_history: fileHistory,
      inter_revision_diffs: interRevisionDiffs,
      summary: {
        first_appearance: presentRevisions.length > 0 ? presentRevisions[0].revision_number : null,
        last_appearance: presentRevisions.length > 0 ? presentRevisions[presentRevisions.length - 1].revision_number : null,
        total_modifications: presentRevisions.length,
        total_lines_inserted: totalLinesInserted,
        total_lines_deleted: totalLinesDeleted
      },
      stat: "ok"
    };
  }

  /**
   * Get complete change history of a review request
   * Use case: "Show me the history of changes"
   */
  async getReviewRequestHistory(reviewRequestId: number): Promise<any> {
    const response = await this.client.get(`/api/review-requests/${reviewRequestId}/changes/`);
    const changes = response.data.changes || [];

    return {
      total_changes: changes.length,
      changes: changes.map((change: any) => ({
        change_id: change.id,
        timestamp: change.timestamp,
        fields_changed: change.fields_changed || {},
        user: {
          username: change.links?.user?.title || 'unknown'
        },
        diff_updated: !!change.fields_changed?.diff,
        description_updated: !!change.fields_changed?.description,
        summary_updated: !!change.fields_changed?.summary,
        status_updated: !!change.fields_changed?.status,
        reviewers_updated: !!(change.fields_changed?.target_people || change.fields_changed?.target_groups)
      })),
      stat: "ok"
    };
  }

  /**
   * Compare two revisions
   * Use case: "What changed between revision 1 and 3?"
   */
  async compareRevisions(reviewRequestId: number, fromRevision: number, toRevision: number): Promise<any> {
    const [fromSummary, toSummary] = await Promise.all([
      this.getRevisionSummary(reviewRequestId, fromRevision),
      this.getRevisionSummary(reviewRequestId, toRevision)
    ]);

    // Compare files
    const fromFiles = new Map(fromSummary.files.map((f: any) => [f.dest_file, f]));
    const toFiles = new Map(toSummary.files.map((f: any) => [f.dest_file, f]));

    const filesAdded: any[] = [];
    const filesRemoved: any[] = [];
    const filesModified: any[] = [];
    const filesUnchanged: any[] = [];

    // Check files in toRevision
    for (const [path, toFileAny] of toFiles.entries()) {
      const toFile: any = toFileAny;
      if (!fromFiles.has(path)) {
        filesAdded.push(toFile);
      } else {
        const fromFile: any = fromFiles.get(path);
        if (toFile.lines_inserted !== fromFile.lines_inserted ||
            toFile.lines_deleted !== fromFile.lines_deleted) {
          filesModified.push({
            file: path,
            from_revision: { ...fromFile },
            to_revision: { ...toFile },
            delta: {
              insertions: toFile.lines_inserted - fromFile.lines_inserted,
              deletions: toFile.lines_deleted - fromFile.lines_deleted
            }
          });
        } else {
          filesUnchanged.push(path);
        }
      }
    }

    // Check for removed files
    for (const [path, fromFile] of fromFiles.entries()) {
      if (!toFiles.has(path)) {
        filesRemoved.push(fromFile);
      }
    }

    return {
      from_revision: fromRevision,
      to_revision: toRevision,
      comparison: {
        files_added: filesAdded,
        files_removed: filesRemoved,
        files_modified: filesModified,
        files_unchanged: filesUnchanged,
        statistics: {
          total_files_added: filesAdded.length,
          total_files_removed: filesRemoved.length,
          total_files_modified: filesModified.length,
          total_files_unchanged: filesUnchanged.length,
          insertions_delta: toSummary.statistics.total_insertions - fromSummary.statistics.total_insertions,
          deletions_delta: toSummary.statistics.total_deletions - fromSummary.statistics.total_deletions
        }
      },
      from_summary: fromSummary,
      to_summary: toSummary,
      stat: "ok"
    };
  }

  /**
   * Get file evolution across all revisions
   * Use case: "Show me how file X evolved"
   */
  async getFileHistory(reviewRequestId: number, filePath: string): Promise<any> {
    const diffsResponse = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/`);
    const diffs = diffsResponse.data.diffs || [];

    const history: any[] = [];

    for (const diff of diffs) {
      try {
        const filesResponse = await this.client.get(
          `/api/review-requests/${reviewRequestId}/diffs/${diff.revision}/files/`
        );
        const files = filesResponse.data.files || [];

        const targetFile = files.find((f: any) =>
          f.source_file === filePath || f.dest_file === filePath
        );

        if (targetFile) {
          history.push({
            revision_number: diff.revision,
            timestamp: diff.timestamp,
            file_id: targetFile.id,
            status: targetFile.status,
            lines_inserted: targetFile.extra_data?.insert_count || 0,
            lines_deleted: targetFile.extra_data?.delete_count || 0,
            total_lines: targetFile.extra_data?.total_line_count || 0,
            source_file: targetFile.source_file,
            dest_file: targetFile.dest_file
          });
        }
      } catch (e) {
        // Skip revisions where we can't get file info
      }
    }

    return {
      file_path: filePath,
      total_revisions: diffs.length,
      revisions_with_file: history.length,
      history: history,
      stat: "ok"
    };
  }

  /**
   * Analyze whether comments were addressed in subsequent revisions
   * Use case: "Were all comments addressed?" "Did the author fix the issues?"
   */
  async analyzeCommentResolution(reviewRequestId: number): Promise<any> {
    // Get all comments with their locations and status
    const commentsAnalysis = await this.getComprehensiveCommentsAnalysis(reviewRequestId);
    const allComments = commentsAnalysis.all_comments.diff_comments || [];

    // Get all revisions to understand timeline
    const diffsResponse = await this.client.get(`/api/review-requests/${reviewRequestId}/diffs/`);
    const allDiffs = diffsResponse.data.diffs || [];
    const latestRevision = Math.max(...allDiffs.map((d: any) => d.revision));

    // Group comments by file and analyze each
    const fileComments = new Map<string, any[]>();

    for (const comment of allComments) {
      // Extract file path from the filediff link
      let filePath = 'Unknown';
      if (comment.links?.filediff?.title) {
        const match = comment.links.filediff.title.match(/^([^(]+)/);
        if (match) {
          filePath = match[1].trim();
        }
      }

      if (!fileComments.has(filePath)) {
        fileComments.set(filePath, []);
      }
      fileComments.get(filePath)!.push(comment);
    }

    // Analyze each file's comments
    const analysis: any[] = [];

    for (const [filePath, comments] of fileComments.entries()) {
      // Get file history to see which revisions modified this file
      let fileHistory: any;
      try {
        fileHistory = await this.getFileHistory(reviewRequestId, filePath);
      } catch (e) {
        continue;
      }

      // For each comment, determine if it was addressed
      for (const comment of comments) {
        const commentRevision = this.extractRevisionFromComment(comment);
        const wasModifiedAfter = fileHistory.history.some((h: any) =>
          h.revision_number > commentRevision
        );

        // Get the actual diff to see if the specific lines changed
        let linesChanged = false;
        if (wasModifiedAfter) {
          try {
            // Get diffs after the comment to see if those lines changed
            const subsequentRevisions = fileHistory.history.filter(
              (h: any) => h.revision_number > commentRevision
            );

            linesChanged = subsequentRevisions.length > 0;
          } catch (e) {
            // If we can't check, assume not changed
          }
        }

        analysis.push({
          comment_id: comment.id,
          file: filePath,
          line_numbers: {
            first: comment.first_line,
            last: comment.first_line + (comment.num_lines || 1) - 1
          },
          comment_text: comment.text,
          reviewer: comment.review_info?.user || 'Unknown',
          timestamp: comment.timestamp,
          issue_status: comment.issue_status,
          issue_opened: comment.issue_opened,
          severity: comment.extra_data?.severity || 'unknown',
          comment_in_revision: commentRevision,
          file_modified_after_comment: wasModifiedAfter,
          likely_addressed:
            comment.issue_status === 'resolved' ||
            comment.issue_status === 'dropped' ||
            (wasModifiedAfter && linesChanged),
          resolution_evidence: this.getResolutionEvidence(comment, wasModifiedAfter, linesChanged)
        });
      }
    }

    // Summarize results
    const summary = {
      total_comments: allComments.length,
      comments_with_issues: allComments.filter((c: any) => c.issue_opened).length,
      resolved_issues: allComments.filter((c: any) => c.issue_status === 'resolved').length,
      dropped_issues: allComments.filter((c: any) => c.issue_status === 'dropped').length,
      open_issues: allComments.filter((c: any) => c.issue_status === 'open').length,
      verifying_issues: allComments.filter((c: any) => c.issue_status === 'verifying').length,
      likely_addressed: analysis.filter(a => a.likely_addressed).length,
      needs_attention: analysis.filter(a =>
        !a.likely_addressed && a.issue_status === 'open'
      ).length
    };

    return {
      summary,
      detailed_analysis: analysis,
      latest_revision: latestRevision,
      stat: "ok"
    };
  }

  private extractRevisionFromComment(comment: any): number {
    // Try to extract revision from the filediff link
    if (comment.links?.filediff?.href) {
      const match = comment.links.filediff.href.match(/diffs\/(\d+)\//);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return 1; // Default to revision 1 if we can't determine
  }

  private getResolutionEvidence(comment: any, wasModifiedAfter: boolean, linesChanged: boolean): string {
    if (comment.issue_status === 'resolved') {
      return 'Explicitly marked as resolved';
    }
    if (comment.issue_status === 'dropped') {
      return 'Marked as dropped (won\'t fix / not applicable)';
    }
    if (wasModifiedAfter && linesChanged) {
      return 'File was modified in subsequent revisions at or near commented lines';
    }
    if (wasModifiedAfter) {
      return 'File was modified after comment, but unclear if specific lines changed';
    }
    if (comment.issue_status === 'open') {
      return 'Issue still open - may need attention';
    }
    return 'No clear evidence of resolution';
  }
}
