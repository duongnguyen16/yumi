import api from "./aixos";

const getOtp = async (phoneNumber: string) => {
  const response = await api.post("auth/register/vendor/request-otp", {
    phone: phoneNumber,
  });
};
