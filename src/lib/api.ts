import axios, {Method, AxiosProgressEvent} from 'axios';

// Base URL and Frontend URL configuration
export const front_url = typeof window !== 'undefined' && window.location && window.location.origin
  ? window.location.origin
  : 'http://localhost:5173';

export const base_url = typeof window !== 'undefined' && window.location && window.location.origin
  ? (window.location.port === '5173' ? 'http://127.0.0.1:8000/api/' : `${window.location.origin}/api/`)
  : 'http://127.0.0.1:8000/api/';

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
  request?: any;
}

export const fetchDataFromAPI = <T>(
  url: string,
  method: Method,
  data?: any,
  token?: string,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
  responseType: 'json' | 'blob' | 'arraybuffer' | 'text' = 'json'
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      Accept: responseType === 'blob' ? '*/*' : 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    axios({
      method,
      baseURL: base_url + url,
      headers,
      data,
      onUploadProgress,
      responseType,
    })
      .then((response: any) => {
        if (responseType === 'blob') {
          // For blob responses, return the full response object to access headers
          resolve({
            data: response.data,
            headers: response.headers,
            status: response.status,
          } as T);
        } else {
          resolve(response.data);
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};
