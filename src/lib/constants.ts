const constants = {
  USER: "USER",
  DEFAULT_BACKUP_BUCKET: "CV_DEFAULT_BACKUP_BUCKET",
  AUTO_UPLOAD_ON_SHARE: "CV_AUTO_UPLOAD_ON_SHARE",
};

export default constants;

export const saveUserLocally = (user: string): void => {
  // Store raw token or string without redundant double quotes
  let cleaned = user;
  try {
    const parsed = JSON.parse(user);
    if (typeof parsed === 'string') cleaned = parsed;
    else if (parsed && typeof parsed === 'object' && parsed.token) cleaned = parsed.token;
  } catch {
    cleaned = user;
  }
  localStorage.setItem(constants.USER, cleaned);
};

export const getAuthToken = (): string | null => {
  const val = localStorage.getItem(constants.USER);
  if (!val) return null;
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object') {
      return parsed.token || parsed.plainTextToken || val;
    }
    return val;
  } catch {
    return val;
  }
};

export const getUser = (): string | null => {
  const token = getAuthToken();
  return token ? JSON.stringify(token) : null;
};

export const getDefaultBackupBucket = (): string | null => {
  return localStorage.getItem(constants.DEFAULT_BACKUP_BUCKET);
};

export const setDefaultBackupBucket = (bucketId: string): void => {
  localStorage.setItem(constants.DEFAULT_BACKUP_BUCKET, bucketId);
};

export const isAutoUploadOnShareEnabled = (): boolean => {
  return localStorage.getItem(constants.AUTO_UPLOAD_ON_SHARE) === 'true';
};

export const setAutoUploadOnShare = (enabled: boolean): void => {
  localStorage.setItem(constants.AUTO_UPLOAD_ON_SHARE, enabled ? 'true' : 'false');
};
