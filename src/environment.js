let IS_PROD = true;
const server = IS_PROD ?
    "https://meetsphere-back.onrender.com" :
    "http://localhost:8000"

export default server;
