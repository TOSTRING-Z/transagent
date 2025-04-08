class Window {
    constructor(windowManager) {
        if (new.target === Window) {
            throw new Error("Window is an abstract class and cannot be instantiated directly.");
        }
        this.windowManager = windowManager;
        this.window = null;
    }

    // 抽象方法
    create() {
        throw new Error("Method 'create()' must be implemented.");
    }

    distroy() {
        throw new Error("Method 'distroy()' must be implemented.");
    }

    setup() {
        throw new Error("Method 'setup()' must be implemented.");
    }
}

module.exports = {
    Window
};