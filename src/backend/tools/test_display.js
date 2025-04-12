const {main} = require('./display_file');
const display = new main();

// 测试图片文件
async function testImage() {
  const result = await display.display('/tmp/expression_heatmap.png');
  console.log('图片测试结果:', result);
}

// 测试表格文件
async function testTable() {
  const result = await display.display('/tmp/exp_genes_3a1eb33a-16c5-11f0-b22a-0242ac110003.csv');
  console.log('表格测试结果:', result);
}

// 测试文本文件
async function testText() {
  const result = await display.display('/tmp/intersect_result_sample.txt');
  console.log('文本测试结果:', result);
}

// // 测试Markdown文件
// async function testMarkdown() {
//   const result = await display.display('/tmp/artical.md');
//   console.log('Markdown测试结果:', result);
// }

// 执行所有测试
async function runTests() {
  await testImage();
  await testTable();
  await testText();
  // await testMarkdown();
}

runTests().catch(console.error);