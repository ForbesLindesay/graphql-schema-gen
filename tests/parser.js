import assert from 'assert';
import test from 'testit';
import {diffLines} from 'diff';
import chalk from 'chalk';
import parse from '../src/parser.js';

function expect(input) {
  return {
    to: {
      equal(expected) {
        if (input !== expected) {
          var diff = diffLines(input, expected);
          var err = '';
          diff.forEach(function (chunk) {
            err += chunk.added ? chalk.red(chunk.value) : chunk.removed ? chalk.green(chunk.value) : chunk.value;
          });
          throw err;
        }
      },
      throw() {
        try {
          input();
        } catch (ex) {
          return;
        }
        throw new Error('Expected an error');
      }
    }
  };
}

function createLocFn(body) {
  return (start, end) => ({
    start,
    end,
    source: {
      body,
      name: 'GraphQL',
    },
  });
}

function printJson(obj) {
  return JSON.stringify(obj, null, 2);
}

function typeNode(name, loc) {
  return {
    kind: 'NamedType',
    name: nameNode(name, loc),
    loc,
  };
}

function nameNode(name, loc) {
  return {
    kind: 'Name',
    value: name,
    loc,
  };
}

function fieldNode(name, type, loc) {
  return {
    kind: 'FieldDefinition',
    name,
    arguments: null,
    type,
    loc,
  };
}

function fieldNodeWithArgs(name, type, args, loc) {
  return {
    kind: 'FieldDefinition',
    name,
    arguments: args,
    type,
    loc,
  };
}

function enumValueNode(name, loc) {
  return {
    kind: 'EnumValueDefinition',
    name: nameNode(name, loc),
    loc,
  };
}

function inputValueNode(name, type, defaultValue, loc) {
  return {
    kind: 'InputValueDefinition',
    name,
    type,
    defaultValue,
    loc,
  };
}


test('parser', () => {
  test('Simple type', () => {
    var body = `
type Hello {
  world: String
}`;
    var doc = parse(body);
    var loc = createLocFn(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'ObjectTypeDefinition',
          name: nameNode('Hello', loc(6, 11)),
          interfaces: [],
          fields: [
            fieldNode(
              nameNode('world', loc(16, 21)),
              typeNode('String', loc(23, 29)),
              loc(16, 29)
            )
          ],
          loc: loc(1, 31),
        }
      ],
      loc: loc(1, 31),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Simple extension', () => {
    var body = `
extend type Hello {
  world: String
}`;
    var doc = parse(body);
    var loc = createLocFn(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'TypeExtensionDefinition',
          definition: {
            kind: 'ObjectTypeDefinition',
            name: nameNode('Hello', loc(13, 18)),
            interfaces: [],
            fields: [
              fieldNode(
                nameNode('world', loc(23, 28)),
                typeNode('String', loc(30, 36)),
                loc(23, 36)
              )
            ],
            loc: loc(8, 38),
          },
          loc: loc(1, 38),
        }
      ],
      loc: loc(1, 38)
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Simple non-null type', () => {
    var body = `
type Hello {
  world: String!
}`;
    var loc = createLocFn(body);
    var doc = parse(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'ObjectTypeDefinition',
          name: nameNode('Hello', loc(6, 11)),
          interfaces: [],
          fields: [
            fieldNode(
              nameNode('world', loc(16, 21)),
              {
                kind: 'NonNullType',
                type: typeNode('String', loc(23, 29)),
                loc: loc(23, 30),
              },
              loc(16, 30)
            )
          ],
          loc: loc(1, 32),
        }
      ],
      loc: loc(1, 32),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });


  test('Simple type inheriting interface', () => {
    var body = `type Hello implements World { }`;
    var loc = createLocFn(body);
    var doc = parse(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'ObjectTypeDefinition',
          name: nameNode('Hello', loc(5, 10)),
          interfaces: [ typeNode('World', loc(22, 27)) ],
          fields: [],
          loc: loc(0, 31),
        }
      ],
      loc: loc(0, 31),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Simple type inheriting multiple interfaces', () => {
    var body = `type Hello implements Wo, rld { }`;
    var loc = createLocFn(body);
    var doc = parse(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'ObjectTypeDefinition',
          name: nameNode('Hello', loc(5, 10)),
          interfaces: [
            typeNode('Wo', loc(22, 24)),
            typeNode('rld', loc(26, 29))
          ],
          fields: [],
          loc: loc(0, 33),
        }
      ],
      loc: loc(0, 33),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Single value enum', () => {
    var body = `enum Hello { WORLD }`;
    var loc = createLocFn(body);
    var doc = parse(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'EnumTypeDefinition',
          name: nameNode('Hello', loc(5, 10)),
          values: [ enumValueNode('WORLD', loc(13, 18)) ],
          loc: loc(0, 20),
        }
      ],
      loc: loc(0, 20),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Double value enum', () => {
    var body = `enum Hello { WO, RLD }`;
    var loc = createLocFn(body);
    var doc = parse(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'EnumTypeDefinition',
          name: nameNode('Hello', loc(5, 10)),
          values: [
            enumValueNode('WO', loc(13, 15)),
            enumValueNode('RLD', loc(17, 20)),
          ],
          loc: loc(0, 22),
        }
      ],
      loc: loc(0, 22),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Simple interface', () => {
    var body = `
interface Hello {
  world: String
}`;
    var doc = parse(body);
    var loc = createLocFn(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'InterfaceTypeDefinition',
          name: nameNode('Hello', loc(11, 16)),
          fields: [
            fieldNode(
              nameNode('world', loc(21, 26)),
              typeNode('String', loc(28, 34)),
              loc(21, 34)
            )
          ],
          loc: loc(1, 36),
        }
      ],
      loc: loc(1, 36),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Simple interface with reserved key', () => {
    var body = `
interface Hello {
  type: String
}`;
    var doc = parse(body);
    var loc = createLocFn(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'InterfaceTypeDefinition',
          name: nameNode('Hello', loc(11, 16)),
          fields: [
            fieldNode(
              nameNode('type', loc(21, 25)),
              typeNode('String', loc(27, 33)),
              loc(21, 33)
            )
          ],
          loc: loc(1, 35),
        }
      ],
      loc: loc(1, 35),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Simple field with arg', () => {
    var body = `
type Hello {
  world(flag: Boolean): String
}`;
    var doc = parse(body);
    var loc = createLocFn(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'ObjectTypeDefinition',
          name: nameNode('Hello', loc(6, 11)),
          interfaces: [],
          fields: [
            fieldNodeWithArgs(
              nameNode('world', loc(16, 21)),
              typeNode('String', loc(38, 44)),
              [
                inputValueNode(
                  nameNode('flag', loc(22, 26)),
                  typeNode('Boolean', loc(28, 35)),
                  null,
                  loc(22, 35)
                )
              ],
              loc(16, 44)
            )
          ],
          loc: loc(1, 46),
        }
      ],
      loc: loc(1, 46),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Simple field with arg with default value', () => {
    var body = `
type Hello {
  world(flag: Boolean = true): String
}`;
    var doc = parse(body);
    var loc = createLocFn(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'ObjectTypeDefinition',
          name: nameNode('Hello', loc(6, 11)),
          interfaces: [],
          fields: [
            fieldNodeWithArgs(
              nameNode('world', loc(16, 21)),
              typeNode('String', loc(45, 51)),
              [
                inputValueNode(
                  nameNode('flag', loc(22, 26)),
                  typeNode('Boolean', loc(28, 35)),
                  {
                    kind: 'BooleanValue',
                    value: true,
                    loc: loc(38, 42),
                  },
                  loc(22, 42)
                )
              ],
              loc(16, 51)
            )
          ],
          loc: loc(1, 53),
        }
      ],
      loc: loc(1, 53),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Simple field with list arg', () => {
    var body = `
type Hello {
  world(things: [String]): String
}`;
    var doc = parse(body);
    var loc = createLocFn(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'ObjectTypeDefinition',
          name: nameNode('Hello', loc(6, 11)),
          interfaces: [],
          fields: [
            fieldNodeWithArgs(
              nameNode('world', loc(16, 21)),
              typeNode('String', loc(41, 47)),
              [
                inputValueNode(
                  nameNode('things', loc(22, 28)),
                  {
                    kind: 'ListType',
                    type: typeNode('String', loc(31, 37)),
                    loc: loc(30, 38)
                  },
                  null,
                  loc(22, 38)
                )
              ],
              loc(16, 47)
            )
          ],
          loc: loc(1, 49),
        }
      ],
      loc: loc(1, 49),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Simple field with two args', () => {
    var body = `
type Hello {
  world(argOne: Boolean, argTwo: Int): String
}`;
    var doc = parse(body);
    var loc = createLocFn(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'ObjectTypeDefinition',
          name: nameNode('Hello', loc(6, 11)),
          interfaces: [],
          fields: [
            fieldNodeWithArgs(
              nameNode('world', loc(16, 21)),
              typeNode('String', loc(53, 59)),
              [
                inputValueNode(
                  nameNode('argOne', loc(22, 28)),
                  typeNode('Boolean', loc(30, 37)),
                  null,
                  loc(22, 37)
                ),
                inputValueNode(
                  nameNode('argTwo', loc(39, 45)),
                  typeNode('Int', loc(47, 50)),
                  null,
                  loc(39, 50)
                ),
              ],
              loc(16, 59)
            )
          ],
          loc: loc(1, 61),
        }
      ],
      loc: loc(1, 61),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Simple union', () => {
    var body = `union Hello = World`;
    var doc = parse(body);
    var loc = createLocFn(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'UnionTypeDefinition',
          name: nameNode('Hello', loc(6, 11)),
          types: [ typeNode('World', loc(14, 19)) ],
          loc: loc(0, 19),
        }
      ],
      loc: loc(0, 19),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Union with two types', () => {
    var body = `union Hello = Wo | Rld`;
    var doc = parse(body);
    var loc = createLocFn(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'UnionTypeDefinition',
          name: nameNode('Hello', loc(6, 11)),
          types: [
            typeNode('Wo', loc(14, 16)),
            typeNode('Rld', loc(19, 22)),
          ],
          loc: loc(0, 22),
        }
      ],
      loc: loc(0, 22),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Scalar', () => {
    var body = `scalar Hello`;
    var doc = parse(body);
    var loc = createLocFn(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'ScalarTypeDefinition',
          name: nameNode('Hello', loc(7, 12)),
          loc: loc(0, 12),
        }
      ],
      loc: loc(0, 12),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Simple input object', () => {
    var body = `
input Hello {
  world: String
}`;
    var doc = parse(body);
    var loc = createLocFn(body);
    var expected = {
      kind: 'Document',
      definitions: [
        {
          kind: 'InputObjectTypeDefinition',
          name: nameNode('Hello', loc(7, 12)),
          fields: [
            inputValueNode(
              nameNode('world', loc(17, 22)),
              typeNode('String', loc(24, 30)),
              null,
              loc(17, 30)
            )
          ],
          loc: loc(1, 32),
        }
      ],
      loc: loc(1, 32),
    };
    expect(printJson(doc)).to.equal(printJson(expected));
  });

  test('Simple input object with args should fail', () => {
    var body = `
input Hello {
  world(foo: Int): String
}`;
    expect(() => parse(body)).to.throw('Error');
  });

});
