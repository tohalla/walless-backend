module.exports = {
  parser: 'babel-eslint',
  extends: [
    'google',
    'cleanjs'
  ],
  plugins: [
    'babel'
  ],
  rules: {
    'arrow-parens': 0,
    'generator-star-spacing': 0,
    'fp/no-unused-expression': 0,
    'fp/no-mutating-methods': 0,
    'better/no-new': 0,
    'better/no-ifs': 0,
    'no-nested-ternary': 0,
    'operator-linebreak': 0,
    "babel/generator-star-spacing": 1,
    "babel/new-cap": 1,
    "babel/array-bracket-spacing": 1,
    "babel/object-curly-spacing": 1,
    "babel/object-shorthand": 1,
    "babel/no-await-in-loop": 1,
    "babel/flow-object-type": 1,
    "babel/func-params-comma-dangle": 1,
    "max-len": 1
  }
};
