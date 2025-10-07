export const handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Use POST /start-audit with {url}." }),
  };
};
