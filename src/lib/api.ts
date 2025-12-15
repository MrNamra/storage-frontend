import axios, {Method} from 'axios';

// Development server
const base_url = 'https://api.happybilling.serv00.net/api/';
// const base_url = "http://storage.raju.serv00.net/api/";

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
    })
      .then((response: ApiResponse<T>) => {
        resolve(response.data);
      })
      .catch((error) => {
        reject(error);
      });
  });
};
