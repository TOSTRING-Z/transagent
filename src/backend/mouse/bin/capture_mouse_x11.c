#include <X11/Xlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/sysmacros.h>  // 添加此行以包含 makedev 函数

#define DEVICE_NAME "mouse_data"

void capture_mouse_position(Display *display, int screen, int *x, int *y) {
    Window root = RootWindow(display, screen);
    XEvent event;
    XQueryPointer(display, root, &event.xbutton.root, &event.xbutton.window,
                  &event.xbutton.x_root, &event.xbutton.y_root,
                  &event.xbutton.x, &event.xbutton.y,
                  &event.xbutton.state);
    *x = event.xbutton.x;
    *y = event.xbutton.y;
}

int main() {
    // 打开X11显示
    Display *display = XOpenDisplay(NULL);
    if (display == NULL) {
        perror("无法打开X显示");
        exit(1);
    }

    int screen = DefaultScreen(display);

    // 捕获鼠标位置并写入设备文件
    int x, y;
    capture_mouse_position(display, screen, &x, &y);

    // 将鼠标坐标转为字符串
    char mousePos[100];
    snprintf(mousePos, sizeof(mousePos), "{\"x\":%d, \"y\":%d}", x, y);
    printf(mousePos);

    // 清理资源
    XCloseDisplay(display);

    return 0;
}
