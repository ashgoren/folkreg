const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

// True for local Supabase. Used to refuse running tests/seed against hosted project.
export const isLocalUrl = (url: string) => {
  try {
    const { protocol, hostname } = new URL(url);
    return (protocol === "http:" || protocol === "https:") && LOCAL_HOSTS.has(hostname);
  } catch {
    return false;
  }
};
