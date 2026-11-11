export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const startLogin = (register = false) => {
  window.location.href = register ? "/cadastro" : "/entrar";
};
