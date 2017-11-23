import { common } from "../interfaces"

export const simplify = (nodes: Array<common.typed.Node>): Array<common.typedSimple.Node> => {
	return nodes.map(node => simplifyNode(node))
}

function simplifyNode(node: common.typed.Node): common.typedSimple.Node {
	switch (node.nodeType) {
		case "NativeFunctionInvocation":
		case "MethodInvocation":
		case "FunctionInvocation":
		case "Combination":
		case "RecordValue":
		case "StringValue":
		case "NumberValue":
		case "BooleanValue":
		case "FunctionValue":
		case "ArrayValue":
		case "Lookup":
		case "Identifier":
		case "Self":
		case "MethodLookup":
			return simplifyExpression(node)
		case "ConstantDeclarationStatement":
		case "VariableDeclarationStatement":
		case "VariableAssignmentStatement":
		case "TypeDefinitionStatement":
		case "IfElseStatement":
		case "IfStatement":
		case "ReturnStatement":
		case "FunctionStatement":
			return simplifyStatement(node)
	}
}

/////////////////
/* Expressions */
/////////////////

function simplifyExpression(node: common.typed.ExpressionNode): common.typedSimple.ExpressionNode {
	switch (node.nodeType) {
		case "NativeFunctionInvocation":
			return simplifyNativeFunctionInvocation(node)
		case "MethodInvocation":
			return simplifyMethodInvocation(node)
		case "FunctionInvocation":
			return simplifyFunctionInvocation(node)
		case "Combination":
			return simplifyCombination(node)
		case "RecordValue":
			return simplifyRecordValue(node)
		case "StringValue":
			return simplifyStringValue(node)
		case "NumberValue":
			return simplifyNumberValue(node)
		case "BooleanValue":
			return simplifyBooleanValue(node)
		case "FunctionValue":
			return simplifyFunctionValue(node)
		case "ArrayValue":
			return simplifyArrayValue(node)
		case "Lookup":
			return simplifyLookup(node)
		case "Identifier":
			return simplifyIdentifier(node)
		case "Self":
			return simplifySelf(node)
		case "MethodLookup":
			return simplifyMethodLookup(node)
	}
}

function simplifyNativeFunctionInvocation(
	node: common.typed.NativeFunctionInvocationNode,
): common.typedSimple.NativeFunctionInvocationNode {
	let name

	if (node.name.nodeType === "Identifier") {
		name = simplifyIdentifier(node.name)
	} else {
		name = simplifyLookup(node.name)
	}

	return {
		nodeType: "NativeFunctionInvocation",
		name,
		arguments: node.arguments.map(arg => simplifyArgument(arg)),
		type: node.type,
	}
}

function simplifyMethodInvocation(node: common.typed.MethodInvocationNode): common.typedSimple.FunctionInvocationNode {
	return {
		nodeType: "FunctionInvocation",
		name: simplifyExpression(node.name),
		arguments: [
			{
				nodeType: "Argument",
				name: "@",
				value: simplifyExpression(node.name.base),
			},
			...node.arguments.map(arg => simplifyArgument(arg)),
		],
		type: node.type,
	}
}

function simplifyFunctionInvocation(
	node: common.typed.FunctionInvocationNode,
): common.typedSimple.FunctionInvocationNode {
	return {
		nodeType: "FunctionInvocation",
		name: simplifyExpression(node.name),
		arguments: node.arguments.map(arg => simplifyArgument(arg)),
		type: node.type,
	}
}

function simplifyCombination(node: common.typed.CombinationNode): common.typedSimple.CombinationNode {
	return {
		nodeType: "Combination",
		lhs: simplifyExpression(node.lhs),
		rhs: simplifyExpression(node.rhs),
		type: node.type,
	}
}

function simplifyRecordValue(node: common.typed.RecordValueNode): common.typedSimple.RecordValueNode {
	return {
		nodeType: "RecordValue",
		type: node.declaredType !== null ? node.declaredType : node.type,
		members: simplifyMembers(node.members),
	}
}

function simplifyStringValue(node: common.typed.StringValueNode): common.typedSimple.StringValueNode {
	return {
		nodeType: "StringValue",
		value: node.value,
		type: node.type,
	}
}

function simplifyNumberValue(node: common.typed.NumberValueNode): common.typedSimple.NumberValueNode {
	return {
		nodeType: "NumberValue",
		value: node.value,
		type: node.type,
	}
}

function simplifyBooleanValue(node: common.typed.BooleanValueNode): common.typedSimple.BooleanValueNode {
	return {
		nodeType: "BooleanValue",
		value: node.value,
		type: node.type,
	}
}

function simplifyFunctionValue(node: common.typed.FunctionValueNode): common.typedSimple.FunctionValueNode {
	return {
		nodeType: "FunctionValue",
		value: simplifyFunctionDefinition(node.value),
		type: node.type,
	}
}

function simplifyArrayValue(node: common.typed.ArrayValueNode): common.typedSimple.ArrayValueNode {
	return {
		nodeType: "ArrayValue",
		values: node.values.map(expr => simplifyExpression(expr)),
		type: node.type,
	}
}

function simplifyLookup(node: common.typed.LookupNode): common.typedSimple.LookupNode {
	return {
		nodeType: "Lookup",
		base: simplifyExpression(node.base),
		member: simplifyIdentifier(node.member),
		type: node.type,
	}
}

function simplifyIdentifier(node: common.typed.IdentifierNode): common.typedSimple.IdentifierNode {
	return {
		nodeType: "Identifier",
		name: node.content,
		type: node.type,
	}
}

function simplifySelf(node: common.typed.SelfNode): common.typedSimple.IdentifierNode {
	return {
		nodeType: "Identifier",
		name: "_self",
		type: node.type,
	}
}

function simplifyMethodLookup(node: common.typed.MethodLookupNode): common.typedSimple.LookupNode {
	return {
		nodeType: "Lookup",
		base: {
			nodeType: "Identifier",
			name: node.baseType.name,
			type: node.baseType,
		},
		member: simplifyIdentifier(node.member),
		type: node.type,
	}
}

////////////////
/* Statements */
////////////////

function simplifyStatement(node: common.typed.StatementNode): common.typedSimple.StatementNode {
	switch (node.nodeType) {
		case "ConstantDeclarationStatement":
			return simplifyConstantDeclarationStatement(node)
		case "VariableDeclarationStatement":
			return simplifyVariableDeclarationStatement(node)
		case "VariableAssignmentStatement":
			return simplifyVariableAssignmentStatement(node)
		case "TypeDefinitionStatement":
			return simplifyTypeDefinitionStatement(node)
		case "IfElseStatement":
			return simplifyChoice(node)
		case "IfStatement":
			return simplifyChoice(node)
		case "ReturnStatement":
			return simplifyReturnStatement(node)
		case "FunctionStatement":
			return simplifyFunctionStatement(node)
	}
}

function simplifyConstantDeclarationStatement(
	node: common.typed.ConstantDeclarationStatementNode,
): common.typedSimple.VariableDeclarationStatementNode {
	return {
		nodeType: "VariableDeclarationStatement",
		name: simplifyIdentifier(node.name),
		value: simplifyExpression(node.value),
		type: node.type,
		isConstant: true,
	}
}

function simplifyVariableDeclarationStatement(
	node: common.typed.VariableDeclarationStatementNode,
): common.typedSimple.VariableDeclarationStatementNode {
	return {
		nodeType: "VariableDeclarationStatement",
		name: simplifyIdentifier(node.name),
		value: simplifyExpression(node.value),
		type: node.type,
		isConstant: false,
	}
}

function simplifyVariableAssignmentStatement(
	node: common.typed.VariableAssignmentStatementNode,
): common.typedSimple.VariableAssignmentStatementNode {
	return {
		nodeType: "VariableAssignmentStatement",
		name: simplifyIdentifier(node.name),
		value: simplifyExpression(node.value),
	}
}

function simplifyTypeDefinitionStatement(
	node: common.typed.TypeDefinitionStatementNode,
): common.typedSimple.TypeDefinitionStatementNode {
	return {
		nodeType: "TypeDefinitionStatement",
		name: simplifyIdentifier(node.name),
		properties: node.properties,
		methods: simplifyMethods(node.methods, node.type),
		type: node.type,
	}
}

function simplifyChoice(
	node: common.typed.IfElseStatementNode | common.typed.IfStatementNode,
): common.typedSimple.ChoiceStatementNode {
	let convertedNode: common.typed.IfElseStatementNode
	if (node.nodeType === "IfStatement") {
		convertedNode = {
			nodeType: "IfElseStatement",
			condition: node.condition,
			trueBody: node.body,
			falseBody: [],
			position: node.position,
		}
	} else {
		convertedNode = node
	}

	return {
		nodeType: "ChoiceStatement",
		condition: simplifyExpression(convertedNode.condition),
		trueBody: convertedNode.trueBody.map(node => simplifyNode(node)),
		falseBody: convertedNode.falseBody.map(node => simplifyNode(node)),
	}
}

function simplifyReturnStatement(node: common.typed.ReturnStatementNode): common.typedSimple.ReturnStatementNode {
	return {
		nodeType: "ReturnStatement",
		expression: simplifyExpression(node.expression),
	}
}

function simplifyFunctionStatement(node: common.typed.FunctionStatementNode): common.typedSimple.FunctionStatementNode {
	return {
		nodeType: "FunctionStatement",
		name: simplifyIdentifier(node.name),
		value: simplifyFunctionDefinition(node.value),
	}
}

/////////////
/* Helpers */
/////////////

function simplifyMembers(members: {
	[key: string]: common.typed.ExpressionNode
}): { [key: string]: common.typedSimple.ExpressionNode } {
	let result: { [key: string]: common.typedSimple.ExpressionNode } = {}

	for (let [memberKey, memberExpression] of Object.entries(members)) {
		result[memberKey] = simplifyExpression(memberExpression)
	}

	return result
}

function simplifyMethods(
	methods: {
		[key: string]: { method: common.typed.FunctionValueNode; isStatic: boolean }
	},
	type: common.Type,
): { [key: string]: { method: common.typedSimple.FunctionValueNode; isStatic: boolean } } {
	let result: { [key: string]: { method: common.typedSimple.FunctionValueNode; isStatic: boolean } } = {}

	for (let [memberKey, memberValue] of Object.entries(methods)) {
		let newMethod = { method: simplifyFunctionValue(memberValue.method), isStatic: memberValue.isStatic }

		if (!memberValue.isStatic) {
			newMethod.method.value.parameters.unshift({
				nodeType: "Parameter",
				externalName: {
					nodeType: "Identifier",
					name: "@",
					type,
				},
				internalName: {
					nodeType: "Identifier",
					name: "_self",
					type,
				},
			})
		}

		result[memberKey] = newMethod
	}

	return result
}

function simplifyParameter(node: common.typed.ParameterNode): common.typedSimple.ParameterNode {
	return {
		nodeType: "Parameter",
		externalName: node.externalName ? simplifyIdentifier(node.externalName) : null,
		internalName: simplifyIdentifier(node.internalName),
	}
}

function simplifyFunctionDefinition(
	node: common.typed.FunctionDefinitionNode,
): common.typedSimple.FunctionDefinitionNode {
	return {
		nodeType: "FunctionDefinition",
		parameters: node.parameters.map(param => simplifyParameter(param)),
		body: node.body.map(node => simplifyNode(node)),
	}
}

function simplifyArgument(node: common.typed.ArgumentNode): common.typedSimple.ArgumentNode {
	return {
		nodeType: "Argument",
		name: node.name,
		value: simplifyExpression(node.value),
	}
}