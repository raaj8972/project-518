export const MASTER_OWNER_EMAILS = [
  'ricorrenza.theiqcityfestival@gmail.com'
];

export const isMasterOwner = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return MASTER_OWNER_EMAILS.includes(lower);
};
