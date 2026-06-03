import api from "./aixos";

const login = async (email: string, password: string) => {
  try {
    console.log("Attempting to log in with email:", email);
    const response = await api.post("/auth/login", { email, password });
    console.log("Login response:", response.data);
    if (response.data?.success) {
      return response.data;
    }
  } catch (error) {}
};

export { login };
