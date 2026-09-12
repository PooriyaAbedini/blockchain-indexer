import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import axios, { type AxiosInstance } from 'axios';
import type { AxiosInstancesName } from './instances.js';
import http from 'node:http';
import https from 'node:https';

@Injectable()
export class AxiosService {
  private static instances: { [key: string]: AxiosInstance } = {};
  private static httpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 100,
  });
  private static httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 100,
  });

  // private readonly isDevelopment = this.config.get<boolean>('config.isDevelopment');

  // constructor() {}

  private createInstance(
    baseURL: string,
    additionalHeaders: Record<string, string> = {},
  ): AxiosInstance {
    const headers = {
      accept: 'application/json',
      ...additionalHeaders,
    };

    return axios.create({
      baseURL,
      headers,
      httpAgent: AxiosService.httpAgent,
      httpsAgent: AxiosService.httpsAgent,
    });
  }

  getInstance(name: AxiosInstancesName): AxiosInstance {
    return AxiosService.instances[name];
  }

  // async request<T extends AxiosResponse<any, any>>(
  //   url: string,
  //   method: Method,
  //   data: Record<string, any> = {},
  //   params: Record<string, any> = {},
  //   provider?: AxiosInstancesName | $Enums.Provider | string,
  //   retry = 1,
  //   userId?: string,
  //   costPerRequest = 0,
  // ): Promise<T> {
  //   let lastError: any;
  //   let response: T;
  //   let attempts = 0;

  //   // Try up to retry times
  //   while (attempts < retry) {
  //     try {
  //       const client = provider ? this.getInstance(provider) || axios : axios;
  //       response = await client.request<any, T>({ url, method, data, params });

  //       if (response.status > 299) {
  //         throw new Error('Request failed with status ' + response.status + ' ' + response.data);
  //       }

  //       break;
  //     } catch (error) {
  //       lastError = error;
  //       attempts++;

  //       if (attempts < retry) {
  //         // exponential backoff before next try, starts at 0.5s and doubles each time
  //         const delay = 500 * 2 ** (attempts - 1);
  //         await new Promise((res) => setTimeout(res, delay));
  //       }
  //     }
  //   }

  //   this.repo.requestLog
  //     .create({
  //       provider: provider || '',
  //       endpoint: url,
  //       cost_per_request: costPerRequest,
  //       num_requests: attempts + 1,
  //       user: userId ? { connect: { id: userId } } : undefined,
  //       status: !response! || response.status > 299 ? RequestStatus.FAILURE : RequestStatus.SUCCESS,
  //     })
  //     .catch((error) => {
  //       this.logger.error('Failed to create request log.', { error });
  //     });

  //   if (attempts >= retry && lastError) {
  //     // all retries failed
  //     throw lastError;
  //   }

  //   return response!;
  // }
}
