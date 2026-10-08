// Your social media pages. Fill in the ones you have (the full web address). Empty ones are hidden.
export const SOCIAL = {
  Facebook: '',
  Instagram: '',
  TikTok: '',
  YouTube: '',
};

export function socialLinks(): { name: string; url: string }[] {
  return Object.entries(SOCIAL).filter(([, url]) => Boolean(url)).map(([name, url]) => ({ name, url }));
}
