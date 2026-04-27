var AppConfig = (function() {
    var isCapacitor = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();

    return {
        API_BASE_URL: isCapacitor
            ? 'http://10.254.162.157:3000/api/ai'
            : '/api/ai',
        MODEL: 'deepseek-chat',
        MAX_TOKENS: 2048,
        TEMPERATURE: 0.7,
        STREAM: true
    };
})();
