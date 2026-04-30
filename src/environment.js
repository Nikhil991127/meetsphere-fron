let IS_PROD = true;
const server = IS_PROD ?
    "https://meetsphere-back-r9np.onrender.com" :
    "http://localhost:8000"

export default server;
