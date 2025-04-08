#include <windows.h>
#include <stdio.h>

void capture_mouse_position(int *x, int *y) {
    POINT pt;
    if (GetCursorPos(&pt)) {
        *x = pt.x;
        *y = pt.y;
    } else {
        *x = *y = -1;
    }
}

int main() {
    int x, y;
    capture_mouse_position(&x, &y);
    
    char mousePos[100];
    snprintf(mousePos, sizeof(mousePos), "{\"x\":%d, \"y\":%d}", x, y);
    printf("%s\n", mousePos);

    return 0;
}