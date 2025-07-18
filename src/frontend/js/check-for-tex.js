(function () {
    var body = document.body.textContent;
    if (body.match(/(?:\$|\\\(|\\\[|\\begin\{.*?})/)) {
        if (!window.MathJax) {
            window.MathJax = {
                tex: {
                    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
                    inlineMath: [[["$", "$"]], ["\\(", "\\)"]]
                }
            }
        }
        var script = document.createElement('script');
        script.src = 'tex-mml-chtml.js';
        document.head.appendChild(script);
    }
})();