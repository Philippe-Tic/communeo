const STRAPI_URL = 'http://localhost:1337'

// Shared JWT token across all ApiClient instances to avoid rate limiting
let sharedJwt: string = ''

export class ApiClient {
  private jwt: string = ''

  async login(email = 'test@example.com', password = 'test123') {
    // Reuse shared token if available
    if (sharedJwt) {
      this.jwt = sharedJwt
      return { jwt: sharedJwt }
    }

    // Retry with backoff for rate limiting
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      })

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }

      if (!res.ok) throw new Error(`Login failed: ${res.status}`)
      const data = await res.json()
      this.jwt = data.jwt
      sharedJwt = data.jwt
      return data
    }
    throw new Error('Login failed after retries (rate limited)')
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.jwt}`,
    }
  }

  async get<T = any>(path: string): Promise<T> {
    const res = await fetch(`${STRAPI_URL}${path}`, { headers: this.headers() })
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
    return res.json()
  }

  async post<T = any>(path: string, data: any): Promise<T> {
    const res = await fetch(`${STRAPI_URL}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
    return res.json()
  }

  async put<T = any>(path: string, data: any): Promise<T> {
    const res = await fetch(`${STRAPI_URL}${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
    return res.json()
  }

  async delete(path: string): Promise<void> {
    const res = await fetch(`${STRAPI_URL}${path}`, {
      method: 'DELETE',
      headers: this.headers(),
    })
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
  }

  // Convenience methods for content types
  async createArticle(data: Record<string, any>) {
    return this.post('/api/articles', { data })
  }

  async createPage(data: Record<string, any>) {
    return this.post('/api/pages', { data })
  }

  async createEvent(data: Record<string, any>) {
    return this.post('/api/evenements', { data })
  }

  async createTeamMember(data: Record<string, any>) {
    return this.post('/api/team-members', { data })
  }

  async createAssociation(data: Record<string, any>) {
    return this.post('/api/associations', { data })
  }

  async createAlerte(data: Record<string, any>) {
    return this.post('/api/alertes', { data })
  }

  async createOfficialDocument(data: Record<string, any>) {
    return this.post('/api/official-documents', { data })
  }

  // Cleanup: delete all items of a given type
  async deleteAll(apiPath: string) {
    try {
      const res = await this.get<{ data: Array<{ documentId: string }> }>(apiPath)
      for (const item of res.data || []) {
        try {
          await this.delete(`${apiPath}/${item.documentId}`)
        } catch {
          // ignore errors on cleanup
        }
      }
    } catch {
      // ignore errors on listing (e.g. 403/404 for certain content types)
    }
  }

  async cleanupAll() {
    await this.deleteAll('/api/articles')
    await this.deleteAll('/api/pages')
    await this.deleteAll('/api/evenements')
    await this.deleteAll('/api/team-members')
    await this.deleteAll('/api/associations')
    await this.deleteAll('/api/alertes')
    await this.deleteAll('/api/official-documents')
  }
}
