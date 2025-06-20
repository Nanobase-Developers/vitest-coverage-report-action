import * as core from "@actions/core";
import { stripIndent } from "common-tags";
import type { Thresholds } from "../types/Threshold";

/**
 * Type representing validation result
 */
type ValidationResult = {
	isValid: boolean;
	value?: number;
	warnings: string[];
};

/**
 * Validates a numeric string within the range of 0-100
 */
const validateThresholdValue = (
	input: string,
	parameterName: string,
): ValidationResult => {
	const warnings: string[] = [];

	// Empty string is valid (treated as undefined)
	if (input.trim() === "") {
		return { isValid: true, warnings };
	}

	// Attempt to convert to number
	const numericValue = Number(input);

	// Check for NaN
	if (Number.isNaN(numericValue)) {
		warnings.push(
			`Invalid ${parameterName}: "${input}" is not a valid number. Expected a number between 0 and 100.`,
		);
		return { isValid: false, warnings };
	}

	// Check if integer
	if (!Number.isInteger(numericValue)) {
		warnings.push(
			`Invalid ${parameterName}: "${input}" is not an integer. Expected an integer between 0 and 100.`,
		);
		return { isValid: false, warnings };
	}

	// Range check (0-100)
	if (numericValue < 0 || numericValue > 100) {
		warnings.push(
			`Invalid ${parameterName}: ${numericValue} is out of range. Expected a value between 0 and 100.`,
		);
		return { isValid: false, warnings };
	}

	return { isValid: true, value: numericValue, warnings };
};

/**
 * Parse thresholds from GitHub Action input parameters
 */
const parseActionThresholds = (): Thresholds => {
	const thresholds: Thresholds = {};
	const allWarnings: string[] = [];
	let hasAnyValidThreshold = false;

	// Process each threshold input parameter
	const thresholdInputs = [
		{ key: "threshold-lines", property: "lines" as keyof Thresholds },
		{ key: "threshold-statements", property: "statements" as keyof Thresholds },
		{ key: "threshold-functions", property: "functions" as keyof Thresholds },
		{ key: "threshold-branches", property: "branches" as keyof Thresholds },
	];

	for (const { key, property } of thresholdInputs) {
		const input = core.getInput(key);
		const validation = validateThresholdValue(input, key);

		if (validation.warnings.length > 0) {
			allWarnings.push(...validation.warnings);
		}

		if (validation.isValid && validation.value !== undefined) {
			thresholds[property] = validation.value;
			hasAnyValidThreshold = true;
		}
	}

	// Output warning messages
	if (allWarnings.length > 0) {
		const warningMessage = stripIndent`
			Coverage threshold validation issues found:
			${allWarnings.map((warning) => `  - ${warning}`).join("\n")}
			
			Invalid thresholds will be ignored. Only valid thresholds will be applied.
		`;
		core.warning(warningMessage);
	}

	// Information message when no valid thresholds exist
	// Only when there was some input (excluding empty strings or whitespace only)
	const hasAnyInput = [
		core.getInput("threshold-lines"),
		core.getInput("threshold-statements"),
		core.getInput("threshold-functions"),
		core.getInput("threshold-branches"),
	].some((input) => input.trim() !== "");

	if (!hasAnyValidThreshold && hasAnyInput) {
		core.info(
			"No valid coverage thresholds found. Coverage report will be generated without threshold validation.",
		);
	}

	return thresholds;
};

export { parseActionThresholds };
