let IS_PROD = false;
const server = IS_PROD ?
    "https://meetsphere-back.onrender.com" :
    "http://localhost:8000"

export default server;
