import { common } from "../interfaces"

export const validate = (program: common.typed.Program): common.typed.Program => {
	program.implementation.nodes.map(node => validateImplementationNode(node, null))

	return program
}

function validateImplementationNode(
	node: common.typed.ImplementationNode,
	currentFunctionContext: common.typed.FunctionDefinitionNode | null,
): common.typed.ImplementationNode {
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
		case "ListValue":
		case "Lookup":
		case "Identifier":
		case "Self":
		case "MethodLookup":
			return validateExpression(node)
		case "ConstantDeclarationStatement":
		case "VariableDeclarationStatement":
		case "VariableAssignmentStatement":
		case "TypeDefinitionStatement":
		case "IfElseStatement":
		case "IfStatement":
		case "ReturnStatement":
		case "FunctionStatement":
			return validateStatement(node, currentFunctionContext)
	}
}

// #region Expressions

function validateExpression(node: common.typed.ExpressionNode): common.typed.ExpressionNode {
	switch (node.nodeType) {
		case "NativeFunctionInvocation":
			return validateNativeFunctionInvocation(node)
		case "MethodInvocation":
			return validateMethodInvocation(node)
		case "FunctionInvocation":
			return validateFunctionInvocation(node)
		case "MethodLookup":
			return validateMethodLookup(node)
		case "Lookup":
			return validateLookup(node)
		case "Combination":
		case "RecordValue":
		case "StringValue":
		case "NumberValue":
		case "BooleanValue":
		case "FunctionValue":
		case "ListValue":
		case "Identifier":
		case "Self":
			// these nodes dont need any validation
			return node
	}
}

function validateNativeFunctionInvocation(
	node: common.typed.NativeFunctionInvocationNode,
): common.typed.NativeFunctionInvocationNode {
	const functionType = node.name.type

	if (functionType.type !== "Function") {
		throw new Error("NativeFunctionInvocation: Identifier isn't a function")
	}

	validateSimpleFunctionInvocation(functionType, node.arguments)

	return node
}

function validateMethodInvocation(node: common.typed.MethodInvocationNode): common.typed.MethodInvocationNode {
	const methodType = node.name.type
	const methodArguments = [{ name: null, type: node.name.base.type }, ...node.arguments]

	if (methodType.type !== "Method") {
		throw new Error("MethodInvocation: Identifier isn't a function")
	}

	validateMethodLookup(node.name)

	if (methodType.isOverloaded) {
		let lastIterationHadError = false
		let index = 0

		for (let parameterTypes of methodType.parameterTypes) {
			lastIterationHadError = false

			if (parameterTypes.length !== methodArguments.length) {
				lastIterationHadError = true
				continue
			}

			for (let i = 0; i < parameterTypes.length; i++) {
				if (
					parameterTypes[i].name !== methodArguments[i].name ||
					!matchesType(parameterTypes[i].type, methodArguments[i].type)
				) {
					lastIterationHadError = true
					break
				}
			}

			if (lastIterationHadError === false) {
				break
			}
			index++
		}

		if (lastIterationHadError) {
			throw new Error("MethodInvocation: Passed arguments do not match any overload")
		} else {
			node.overloadedMethodIndex = index
		}
	} else {
		if (methodType.parameterTypes.length !== methodArguments.length) {
			throw new Error("MethodInvocation: Amount of arguments doesn't match")
		}

		for (let i = 0; i < methodType.parameterTypes.length; i++) {
			if (
				methodType.parameterTypes[i].name !== methodArguments[i].name ||
				!matchesType(methodType.parameterTypes[i].type, methodArguments[i].type)
			) {
				if (i === 0) {
					throw new Error(`MethodInvocation: BaseType mismatch`)
				} else {
					throw new Error(`MethodInvocation: ArgumentType mismatch at argument ${i}`)
				}
			}
		}
	}

	return node
}

function validateFunctionInvocation(node: common.typed.FunctionInvocationNode): common.typed.FunctionInvocationNode {
	const functionType = node.name.type

	if (!(functionType.type === "Function" || functionType.type === "Method")) {
		throw new Error("FunctionInvocation: Identifier isn't a Function or Method")
	}

	if (functionType.type === "Function" || (functionType.type === "Method" && functionType.isStatic)) {
		validateSimpleFunctionInvocation(functionType, node.arguments)
	} else {
		// Dynamic methods, being called in a manually via `.` are being validated here,
		// as opposed to methods that are being called with `::` which get validated by `validateMethodInvocation`
		if (functionType.isOverloaded) {
			let lastIterationHadError = false

			for (let parameterTypes of functionType.parameterTypes) {
				lastIterationHadError = false

				if (parameterTypes.length !== node.arguments.length) {
					lastIterationHadError = true
					continue
				}

				for (let i = 0; i < parameterTypes.length; i++) {
					if (
						parameterTypes[i].name !== node.arguments[i].name ||
						!matchesType(parameterTypes[i].type, node.arguments[i].type)
					) {
						lastIterationHadError = true
						break
					}
				}

				if (lastIterationHadError === false) {
					break
				}
			}

			if (lastIterationHadError) {
				throw new Error("MethodInvocation: Passed arguments do not match any overload")
			}
		} else {
			if (functionType.parameterTypes.length !== node.arguments.length) {
				throw new Error("FunctionInvocation: Amount of arguments doesn't match")
			}

			for (let i = 0; i < functionType.parameterTypes.length; i++) {
				if (
					functionType.parameterTypes[i].name !== node.arguments[i].name ||
					!matchesType(functionType.parameterTypes[i].type, node.arguments[i].type)
				) {
					throw new Error(`FunctionInvocation: ArgumentType mismatch at argument ${i + 1}`)
				}
			}
		}
	}

	return node
}

function validateFunctionDefinition(node: common.typed.FunctionDefinitionNode): common.typed.FunctionDefinitionNode {
	node.body.map(bodyNode => validateImplementationNode(bodyNode, node))

	return node
}

function validateLookup(node: common.typed.LookupNode): common.typed.LookupNode {
	validateExpression(node.base)

	return node
}

function validateMethodLookup(node: common.typed.MethodLookupNode): common.typed.MethodLookupNode {
	validateExpression(node.base)

	return node
}

// #endregion

// #region Statements

function validateStatement(
	node: common.typed.StatementNode,
	currentFunctionContext: common.typed.FunctionDefinitionNode | null,
): common.typed.StatementNode {
	switch (node.nodeType) {
		case "ConstantDeclarationStatement":
			return validateConstantDeclarationStatement(node)
		case "VariableDeclarationStatement":
			return validateVariableDeclarationStatement(node)
		case "VariableAssignmentStatement":
			return validateVariableAssignmentStatement(node)
		case "TypeDefinitionStatement":
			return validateTypeDefinitionStatement(node)
		case "IfElseStatement":
			return validateIfElseStatementNode(node, currentFunctionContext)
		case "IfStatement":
			return validateIfStatement(node, currentFunctionContext)
		case "ReturnStatement":
			return validateReturnStatement(node, currentFunctionContext)
		case "FunctionStatement":
			return validateFunctionStatement(node)
	}
}

function validateConstantDeclarationStatement(
	node: common.typed.ConstantDeclarationStatementNode,
): common.typed.ConstantDeclarationStatementNode {
	if (node.declaredType !== null) {
		if (!matchesType(node.declaredType, node.value.type)) {
			throw new Error(`Wrong Assignment Value Type for Constant ${node.name.content}`)
		}
	}

	validateExpression(node.value)

	return node
}

function validateVariableDeclarationStatement(
	node: common.typed.VariableDeclarationStatementNode,
): common.typed.VariableDeclarationStatementNode {
	if (node.declaredType !== null) {
		if (!matchesType(node.declaredType, node.value.type)) {
			throw new Error(`Wrong Assignment Value Type for Variable ${node.name.content}`)
		}
	}

	validateExpression(node.value)

	return node
}

function validateVariableAssignmentStatement(
	node: common.typed.VariableAssignmentStatementNode,
): common.typed.VariableAssignmentStatementNode {
	if (!matchesType(node.name.type, node.value.type)) {
		throw new Error(`Wrong Assignment Value Type for Variable ${node.name.content}`)
	}

	validateExpression(node.value)

	return node
}

function validateTypeDefinitionStatement(
	node: common.typed.TypeDefinitionStatementNode,
): common.typed.TypeDefinitionStatementNode {
	for (let methodName in node.methods) {
		let method = node.methods[methodName]

		if (method.isOverloaded) {
			method.methods.map(overloadedMethod => validateFunctionDefinition(overloadedMethod.value))
		} else {
			validateFunctionDefinition(method.method.value)
		}
	}

	return node
}

function validateIfElseStatementNode(
	node: common.typed.IfElseStatementNode,
	currentFunctionContext: common.typed.FunctionDefinitionNode | null,
): common.typed.IfElseStatementNode {
	if (!(node.condition.type.type === "Primitive" && node.condition.type.primitive === "Boolean")) {
		throw new Error("If Condition has to be a Boolean")
	}

	validateExpression(node.condition)

	node.trueBody.map(node => validateImplementationNode(node, currentFunctionContext))
	node.falseBody.map(node => validateImplementationNode(node, currentFunctionContext))

	return node
}

function validateIfStatement(
	node: common.typed.IfStatementNode,
	currentFunctionContext: common.typed.FunctionDefinitionNode | null,
): common.typed.IfStatementNode {
	if (!(node.condition.type.type === "Primitive" && node.condition.type.primitive === "Boolean")) {
		throw new Error("If Condition has to be a Boolean")
	}

	validateExpression(node.condition)

	node.body.map(node => validateImplementationNode(node, currentFunctionContext))

	return node
}

function validateReturnStatement(
	node: common.typed.ReturnStatementNode,
	currentFunctionContext: common.typed.FunctionDefinitionNode | null,
): common.typed.ReturnStatementNode {
	if (currentFunctionContext === null) {
		throw new Error("Top level returns are not permitted.")
	}

	if (!matchesType(currentFunctionContext.returnType, node.expression.type)) {
		throw new Error("Type of returned expression doesnt match declared return type")
	}

	validateExpression(node.expression)

	return node
}

function validateFunctionStatement(node: common.typed.FunctionStatementNode): common.typed.FunctionStatementNode {
	validateFunctionDefinition(node.value)

	return node
}

// #endregion

// #region Helpers

function validateSimpleFunctionInvocation(
	functionType: common.FunctionType | common.StaticMethodType | common.StaticOverloadedMethodType,
	argumentTypes: common.typed.ArgumentNode[],
) {
	if (functionType.type === "Method" && functionType.isOverloaded) {
		let lastIterationHadError = false

		for (let parameterTypes of functionType.parameterTypes) {
			lastIterationHadError = false

			if (parameterTypes.length !== argumentTypes.length) {
				lastIterationHadError = true
				continue
			}

			for (let i = 0; i < parameterTypes.length; i++) {
				if (
					parameterTypes[i].name !== argumentTypes[i].name ||
					!matchesType(parameterTypes[i].type, argumentTypes[i].type)
				) {
					lastIterationHadError = true
					break
				}
			}

			if (lastIterationHadError === false) {
				break
			}
		}

		if (lastIterationHadError) {
			throw new Error("FunctionInvocation: Passed arguments do not match any overload")
		}
	} else {
		if (functionType.parameterTypes.length !== argumentTypes.length) {
			throw new Error("FunctionInvocation: Amount of arguments doesn't match")
		}

		for (let i = 0; i < functionType.parameterTypes.length; i++) {
			if (
				functionType.parameterTypes[i].name !== argumentTypes[i].name ||
				!matchesType(functionType.parameterTypes[i].type, argumentTypes[i].type)
			) {
				throw new Error(`FunctionInvocation: ArgumentType mismatch at argument ${i + 1}`)
			}
		}
	}
}

function matchesType(lhs: common.Type, rhs: common.Type): boolean {
	// #region Type convertions

	if (lhs.type === "Type") {
		lhs = possiblyConvertTypeToPrimitive(lhs)
	}

	if (rhs.type === "Type") {
		rhs = possiblyConvertTypeToPrimitive(rhs)
	}

	// #endregion

	// #region Even Types

	if (lhs.type === "Primitive" && rhs.type === "Primitive") {
		return lhs.primitive === rhs.primitive
	}

	if (lhs.type === "Record" && rhs.type === "Record") {
		for (let memberName in lhs.members) {
			if (rhs.members[memberName] === undefined) {
				return false
			}

			if (!matchesType(lhs.members[memberName], rhs.members[memberName])) {
				return false
			}
		}

		return true
	}

	if (lhs.type === "List" && rhs.type === "List") {
		if (lhs.itemType.type === "Never") {
			return false
		} else if (rhs.itemType.type === "Never") {
			return true
		} else {
			return matchesType(lhs.itemType, rhs.itemType)
		}
	}

	if (lhs.type === "Function" && rhs.type === "Function") {
		if (lhs.parameterTypes.length !== rhs.parameterTypes.length) {
			return false
		}

		for (let i = 0; i < lhs.parameterTypes.length; i++) {
			if (
				lhs.parameterTypes[i].name !== rhs.parameterTypes[i].name ||
				!matchesType(lhs.parameterTypes[i].type, rhs.parameterTypes[i].type)
			) {
				return false
			}
		}

		if (!matchesType(lhs.returnType, rhs.returnType)) {
			return false
		}

		return true
	}

	if (lhs.type === "Method" && rhs.type === "Method") {
		if (lhs.isOverloaded === false && rhs.isOverloaded === false) {
			if (lhs.parameterTypes.length !== rhs.parameterTypes.length) {
				return false
			}

			if (!matchesType(lhs.returnType, rhs.returnType)) {
				return false
			}

			for (let i = 0; i < lhs.parameterTypes.length; i++) {
				if (
					lhs.parameterTypes[i].name !== rhs.parameterTypes[i].name ||
					!matchesType(lhs.parameterTypes[i].type, rhs.parameterTypes[i].type)
				) {
					return false
				}
			}

			return true
		} else if (lhs.isOverloaded === true && rhs.isOverloaded === true) {
			if (lhs.parameterTypes.length !== rhs.parameterTypes.length) {
				return false
			}

			if (!matchesType(lhs.returnType, rhs.returnType)) {
				return false
			}

			for (let i = 0; i < lhs.parameterTypes.length; i++) {
				if (lhs.parameterTypes[i].length !== rhs.parameterTypes[i].length) {
					return false
				}

				for (let j = 0; j < lhs.parameterTypes.length; j++) {
					if (
						lhs.parameterTypes[i][j].name !== rhs.parameterTypes[i][j].name ||
						!matchesType(lhs.parameterTypes[i][j].type, rhs.parameterTypes[i][j].type)
					) {
						return false
					}
				}
			}

			return true
		} else {
			return false
		}
	}

	// #endregion

	return false
}

function possiblyConvertTypeToPrimitive(
	type: common.TypeType,
): common.PrimitiveType | common.RecordType | common.TypeType {
	if (type.definition.type === "BuiltIn") {
		return type
	} else {
		return type.definition
	}
}

// #endregion
