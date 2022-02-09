const pipe =
  (...funcs) =>
  (...args) => {
    let returnVal = funcs.shift()(...args);
    for (const func of funcs) {
      returnVal = func(returnVal);
    }
    return returnVal;
  };

module.exports = {
  pipe,
};
