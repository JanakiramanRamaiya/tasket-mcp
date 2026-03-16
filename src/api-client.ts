import axios, { AxiosInstance } from 'axios';

export class TasketApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({ baseURL });
  }

  private h(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  // Tasks
  async createTask(body: any, token: string) { return (await this.client.post('/tasks', body, { headers: this.h(token) })).data; }
  async getTask(id: string, token: string) { return (await this.client.get(`/tasks/${id}`, { headers: this.h(token) })).data; }
  async listTasks(params: any, token: string) { return (await this.client.get('/tasks', { params, headers: this.h(token) })).data; }
  async searchTasks(q: string, token: string) { return (await this.client.get('/tasks/search', { params: { q }, headers: this.h(token) })).data; }
  async updateTask(id: string, body: any, token: string) { return (await this.client.put(`/tasks/${id}`, body, { headers: this.h(token) })).data; }
  async changeTaskStatus(id: string, body: any, token: string) { return (await this.client.patch(`/tasks/${id}/status`, body, { headers: this.h(token) })).data; }
  async archiveTask(id: string, token: string) { return (await this.client.delete(`/tasks/${id}`, { headers: this.h(token) })).data; }

  // Pipeline
  async getPipeline(taskId: string, token: string) { return (await this.client.get(`/tasks/${taskId}/pipeline`, { headers: this.h(token) })).data; }
  async setPipeline(taskId: string, body: any, token: string) { return (await this.client.post(`/tasks/${taskId}/pipeline`, body, { headers: this.h(token) })).data; }
  async advancePipeline(taskId: string, body: any, token: string) { return (await this.client.post(`/tasks/${taskId}/pipeline/advance`, body, { headers: this.h(token) })).data; }

  // Updates
  async postUpdate(taskId: string, body: any, token: string) { return (await this.client.post(`/tasks/${taskId}/updates`, body, { headers: this.h(token) })).data; }
  async listUpdates(taskId: string, limit: number, token: string) { return (await this.client.get(`/tasks/${taskId}/updates`, { params: { limit }, headers: this.h(token) })).data; }

  // Context
  async addComment(taskId: string, body: any, token: string) { return (await this.client.post(`/tasks/${taskId}/context/comment`, body, { headers: this.h(token) })).data; }
  async addDecision(taskId: string, body: any, token: string) { return (await this.client.post(`/tasks/${taskId}/context/decision`, body, { headers: this.h(token) })).data; }
  async listContext(taskId: string, type: string | undefined, token: string) { return (await this.client.get(`/tasks/${taskId}/context`, { params: type ? { type } : {}, headers: this.h(token) })).data; }

  // Projects
  async createProject(body: any, token: string) { return (await this.client.post('/projects', body, { headers: this.h(token) })).data; }
  async listProjects(token: string) { return (await this.client.get('/projects', { headers: this.h(token) })).data; }
  async getProject(id: string, token: string) { return (await this.client.get(`/projects/${id}`, { headers: this.h(token) })).data; }

  // Dashboard
  async getDashboard(token: string) { return (await this.client.get('/dashboard', { headers: this.h(token) })).data; }
  async getSilentTasks(token: string) { return (await this.client.get('/dashboard/silent-tasks', { headers: this.h(token) })).data; }
}
