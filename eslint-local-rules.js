module.exports = {
  /**
   * Lint rule that automatically validates moves use calculateDamage
   *
   * Because I forget that allll the time
   */
  'validate-calculate-damage': {
    meta: {
      type: 'problem',
    },
    create(context) {
      let causesDamage = false;
      let calculatedDamage = false;
      return {
        // start of use() block
        'Property[key.name="use"][value.type="FunctionExpression"]': () => {
          causesDamage = false;
          calculatedDamage = false;
        },
        // function calls for scene.causeDamage
        'CallExpression[callee.object.name="scene"][callee.property.name="causeDamage"]': () => {
          causesDamage = true;
        },
        // function calls for calculateDamage
        'CallExpression[callee.name="calculateDamage"]': () => {
          calculatedDamage = true;
        },
        // end of use() block
        'Property[key.name="use"][value.type="FunctionExpression"]:exit': node => {
          if (causesDamage && !calculatedDamage) {
            context.report({
              node,
              message: 'This move deals damage without using calculateDamage',
            });
          }
        },
      };
    },
  },
};
