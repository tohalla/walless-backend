module.exports = {
  parser: 'babel-eslint',
  extends: [
    'google'
  ],
  plugins: [
    'babel'
  ],
  env: {
    node: true,
    es6: true
  },
  rules: {
    'comma-dangle': [2, 'never'],
    'arrow-parens': 0,
    'generator-star-spacing': 0,
    'no-undef': 2,
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
