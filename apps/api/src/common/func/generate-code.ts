import { randomInt } from 'crypto';

const generateSystemCode = () => {
  const code = randomInt(100000, 999999).toString();
  return `CLG-${code}`;
};

const createSystemCodePayload = () => {
  const code = generateSystemCode();

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  return {
    code,
    expiresAt,
    used: false,
  };
};

export { generateSystemCode, createSystemCodePayload };
