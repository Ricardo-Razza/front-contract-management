export const environment = {
  production: false,
  get apiUrl(): string {
    const host = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
    return `http://${host}:8081/api`;
  }
};
