const NODE_ENV = process.env.NODE_ENV
module.exports = {
  pages: {
    index: {
      entry: NODE_ENV === 'production' ? './src/index.js' : './examples/index.js',
      template: 'public/index.html',
      filename: 'index.html'
    }
  },
  // 禁止生成独立的 CSS 文件
  css: { extract: false }
}
