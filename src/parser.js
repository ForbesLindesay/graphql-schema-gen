var reserved = [
  'type',
  'interface',
  'union',
  'scalar',
  'enum',
  'input',
  'extend',
  'null'
];
function isReserved(name) {
  return reserved.indexOf(name) !== -1;
}

export default function parse(str, name) {
  var Source = {body: str, name: name || 'GraphQL'};
  var originalString = str;
  function withPosition(fn) {
    return function () {
      ignored();
      var start = originalString.length - str.length;
      var res = fn.apply(this, arguments);
      var end = originalString.length - str.length;
      end = start + originalString.replace(/\,/g, ' ').substring(start, end).trim().length;
      ignored();
      if (res && !res.loc) {
        res.loc = {start, end, source: Source};
      }
      return res;
    }
  }
  function list(nodeType) {
    var result = [];
    while (true) {
      var node = comment() || nodeType();
      if (node) result.push(node);
      else break;
    }
    return result;
  }

  function match(pattern) {
    if (typeof pattern === 'string') {
      if (str.substr(0, pattern.length) === pattern) {
        str = str.substr(pattern.length);
        return pattern;
      }
    } else {
      var match = pattern.exec(str);
      if (match) {
        str = str.substr(match[0].length);
        return match[0];
      }
    }
  }
  function required(value, name) {
    if (value) {
      return value;
    } else {
      throw new Error('Expected ' + name + ' but got "' + str[0] + '"');
    }
  }
  function expect(str) {
    required(match(str), '"' + str + '"');
  }

  function ignored() {
    // newline
    if (str[0] === '\n') {
      str = str.substr(1);
      return ignored();
    }
    // comma
    if (str[0] === ',') {
      str = str.substr(1);
      return ignored();
    }
    // white space (except newline)
    var m = /^[ \f\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/.exec(str);
    if (m) {
      str = str.substr(m[0].length);
      return ignored();
    }
  }

  var name = withPosition(() => {
    var state = {str};
    var name = match(/^[_A-Za-z][_0-9A-Za-z]*/);
    if (isReserved(name)) {
      str = state.str;
      return;
    }
    if (name) {
      return {
        kind: 'Name',
        value: name
      };
    }
  });
  var namedType = withPosition(() => {
    var n = name();
    if (n) {
      return {
        kind: 'NamedType',
        name: n,
        loc: n.loc
      };
    }
  });
  var listType = withPosition(() => {
    if (match('[')) {
      var node = {
        kind: 'ListType',
        type: required(type(), 'Type')
      };
      expect(']');
      return node;
    }
  });
  var type = withPosition(() => {
    var t = namedType() || listType();
    if (match('!')) {
      return {kind: 'NonNullType', type: t};
    }
    return t;
  });

  var variable = withPosition(() => {
    if (match('$')) {
      return {
        kind: 'Varialbe',
        name: require(name(), 'Name')
      };
    }
  });
  var numberValue = withPosition(() => {
    var str = match(/^(\-?0|\-?[1-9][0-9]*)(\.[0-9]+)?([Ee](\+|\-)?[0-9]+)?/);
    if (str) {
      return {
        kind: 'NumberValue',
        value: JSON.parse(str)
      };
    }
  });
  var stringValue = withPosition(() => {
    var str = match(/^\"([^\"\\\n]|\\\\|\\\")*\"/);
    if (str) {
      return {
        kind: 'StringValue',
        value: JSON.parse(str)
      };
    }
  });
  var booleanValue = withPosition(() => {
    var TRUE = match('true');
    var FALSE = match('false');
    if (TRUE || FALSE) {
      return {
        kind: 'BooleanValue',
        value: TRUE ? true : false
      };
    }
  });
  var enumValue = withPosition(() => {
    var n = name();
    if (n) {
      return {
        kind: 'EnumValue',
        name: n
      };
    }
  });
  var listValue = withPosition((isConst) => {
    if (match('[')) {
      var node = {kind: 'ListValue'};
      node.values = list(value.bind(null, isConst));
      expect(']');
      return node;
    }
  });
  var objectField = withPosition((isConst) => {
    var n = name();
    if (n) {
      expect(':');
      return {
        kind: 'ObjectField',
        name: n,
        value: require(value(isConst), 'Value')
      };
    }
  });
  var objectValue = withPosition((isConst) => {
    if (match('{')) {
      var node = {kind: 'ObjectValue'};
      node.fields = list(objectField.bind(null, isConst));
      expect('}');
      return node;
    }
  });
  var value = withPosition((isConst) => {
    return (
      (!isConst && variable()) ||
      numberValue() ||
      stringValue() ||
      booleanValue() ||
      enumValue() ||
      listValue(isConst) ||
      objectValue(isConst)
    );
  });
  var defaultValue = withPosition(() => {
    if (match('=')) {
      return required(value(true), 'Value');
    }
  });

  var document = withPosition(() => {
    var definitions = list(definition);
    if (str.length) {
      throw new Error('Unexpected character "' + str[0] + '", expected comment or definition');
    }
    return {kind: 'Document', definitions};
  });

  var comment = withPosition(() => {
    var value = match(/^\#[^\n]*/);
    if (value) return {kind: 'Comment', value: value};
  });

  var definition = withPosition(() => {
    // N.B. we don't support operations or fragments
    return typeDefinition();
  });

  var typeDefinition = withPosition(() => {
    return (
      objectTypeDefinition() ||
      interfaceTypeDefinition() ||
      unionTypeDefinition() ||
      scalarTypeDefinition() ||
      enumTypeDefinition() ||
      inputObjectTypeDefinition() ||
      typeExtensionDefinition()
    );
  });
  var objectTypeDefinition = withPosition(() => {
    if (match('type')) {
      var node = {kind: 'ObjectTypeDefinition'};
      node.name = required(name(), 'name');
      node.interfaces = implementsInterfaces() || [];
      expect('{');
      node.fields = list(fieldDefinition);
      expect('}');
      return node;
    }
  });
  var implementsInterfaces = withPosition(() => {
    if (match('implements')) {
      return list(namedType);
    }
  });
  var fieldDefinition = withPosition(() => {
    var node = {kind: 'FieldDefinition'};
    node.name = name();
    if (!node.name) return;
    node.arguments = argumentsDefinition();
    expect(':');
    node.type = required(type(), 'type');
    return node;
  });
  var argumentsDefinition = () => {
    if (!match('(')) return null;
    var args = list(inputValueDefinition);
    expect(')');
    return args || [];
  };
  var inputValueDefinition = withPosition(() => {
    var node = {kind: 'InputValueDefinition'};
    node.name = name();
    if (!node.name) return;
    expect(':');
    node.type = required(type(), 'type');
    node.defaultValue = defaultValue() || null;
    return node;
  });
  var interfaceTypeDefinition = withPosition(() => {
    if (match('interface')) {
      var node = {kind: 'InterfaceTypeDefinition'};
      node.name = required(name(), 'Name');
      expect('{');
      node.fields = list(fieldDefinition);
      expect('}');
      return node;
    }
  });
  var unionTypeDefinition = withPosition(() => {
    if (match('union')) {
      var node = {kind: 'UnionTypeDefinition'};
      node.name = required(name(), 'Name');
      expect('=');
      var types = [];
      types.push(required(namedType(), 'NamedType'));
      while (match('|')) {
        types.push(required(namedType(), 'NamedType'));
      }
      node.types = types;
      return node;
    }
  });
  var scalarTypeDefinition = withPosition(() => {
    if (match('scalar')) {
      var node = {kind: 'ScalarTypeDefinition'};
      node.name = required(name(), 'Name');
      return node;
    }
  });
  var enumTypeDefinition = withPosition(() => {
    if (match('enum')) {
      var node = {kind: 'EnumTypeDefinition'};
      node.name = required(name(), 'Name');
      expect('{');
      node.values = list(enumValueDefinition);
      expect('}');
      return node;
    }
  });
  var enumValueDefinition = withPosition(() => {
    var n = name();
    if (n) {
      return {kind: 'EnumValueDefinition', name: n};
    }
  });
  var inputObjectTypeDefinition = withPosition(() => {
    if (match('input')) {
      var node = {kind: 'InputObjectTypeDefinition'};
      node.name = required(name(), 'Name');
      expect('{');
      node.fields = list(inputValueDefinition);
      expect('}');
      return node;
    }
  });
  var typeExtensionDefinition = withPosition(() => {
    if (match('extend')) {
      var node = {kind: 'TypeExtensionDefinition'};
      node.definition = required(objectTypeDefinition(), 'ObjectTypeDefinition');
      return node;
    }
  });
  return document();
}
