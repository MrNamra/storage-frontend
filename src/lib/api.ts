import axios, {Method, AxiosProgressEvent} from 'axios';

// Development server
export const base_url = "https://api.raju.serv00.net/api/";
export const front_url = "https://raju.serv00.net"
// export const base_url = "http://127.0.0.1:8000/api/";
// export const front_url = "http://localhost:5173"

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
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
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
    })
      .then((response: ApiResponse<T>) => {
        resolve(response.data);
      })
      .catch((error) => {
        reject(error);
      });
  });
};
