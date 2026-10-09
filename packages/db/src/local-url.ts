// True for a local Supabase (`supabase start` serves on 127.0.0.1). Used to refuse running
// anything that overwrites data -- tests, the seed -- against a hosted project.
export const isLocalUrl = (url: string) => /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url);
