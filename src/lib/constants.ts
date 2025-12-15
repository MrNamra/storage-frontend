const constants = {
  USER: "USER",
};

export default constants;

export const saveUserLocally = (user: string): void => {
  localStorage.setItem(constants.USER, user);
};

export const getUser = (): string | null => {
  return localStorage.getItem(constants.USER);
};
