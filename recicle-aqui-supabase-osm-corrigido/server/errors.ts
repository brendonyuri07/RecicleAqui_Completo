import { TRPCError } from "@trpc/server";

export function throwDatabaseError(error: {
  message?: string;
  code?: string;
  status?: number;
}): never {
  const unavailable =
    !error.code ||
    /fetch|network|timeout|aborted/i.test(error.message ?? "") ||
    ["PGRST205", "42P01", "PGRST301"].includes(error.code);
  throw new TRPCError({
    code: unavailable ? "SERVICE_UNAVAILABLE" : "INTERNAL_SERVER_ERROR",
    message: unavailable
      ? "O serviço está indisponível no momento. Tente novamente em instantes."
      : "Não foi possível concluir a operação. Tente novamente.",
  });
}

export function throwAuthError(
  error: { code?: string; status?: number },
  registering = false
): never {
  if (!error.status || error.status >= 500) throwDatabaseError({});
  if (error.status === 429)
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Muitas tentativas. Aguarde alguns instantes e tente novamente.",
    });
  if (registering)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Não foi possível criar a conta. Confira o e-mail e a senha, ou entre se já possui cadastro.",
    });
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "E-mail ou senha inválidos.",
  });
}
