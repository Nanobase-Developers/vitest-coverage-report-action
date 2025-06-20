import * as core from "@actions/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseActionThresholds } from "./parseActionThresholds";

// Mock for @actions/core
vi.mock("@actions/core");

describe("parseActionThresholds", () => {
	const mockGetInput = vi.mocked(core.getInput);
	const mockWarning = vi.mocked(core.warning);
	const mockInfo = vi.mocked(core.info);

	beforeEach(() => {
		vi.clearAllMocks();
		// Set to return empty string by default
		mockGetInput.mockReturnValue("");
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("Valid input values", () => {
		it("should correctly parse all valid thresholds", () => {
			mockGetInput.mockImplementation((key: string) => {
				switch (key) {
					case "threshold-lines":
						return "80";
					case "threshold-statements":
						return "85";
					case "threshold-functions":
						return "90";
					case "threshold-branches":
						return "75";
					default:
						return "";
				}
			});

			const result = parseActionThresholds();

			expect(result).toEqual({
				lines: 80,
				statements: 85,
				functions: 90,
				branches: 75,
			});
			expect(mockWarning).not.toHaveBeenCalled();
			expect(mockInfo).not.toHaveBeenCalled();
		});

		it("should correctly parse partial thresholds", () => {
			mockGetInput.mockImplementation((key: string) => {
				switch (key) {
					case "threshold-lines":
						return "80";
					case "threshold-functions":
						return "90";
					default:
						return "";
				}
			});

			const result = parseActionThresholds();

			expect(result).toEqual({
				lines: 80,
				functions: 90,
			});
			expect(mockWarning).not.toHaveBeenCalled();
			expect(mockInfo).not.toHaveBeenCalled();
		});

		it("should correctly handle boundary values (0 and 100)", () => {
			mockGetInput.mockImplementation((key: string) => {
				switch (key) {
					case "threshold-lines":
						return "0";
					case "threshold-statements":
						return "100";
					default:
						return "";
				}
			});

			const result = parseActionThresholds();

			expect(result).toEqual({
				lines: 0,
				statements: 100,
			});
			expect(mockWarning).not.toHaveBeenCalled();
		});

		it("should treat empty strings as undefined", () => {
			mockGetInput.mockReturnValue("");

			const result = parseActionThresholds();

			expect(result).toEqual({});
			expect(mockWarning).not.toHaveBeenCalled();
			expect(mockInfo).not.toHaveBeenCalled();
		});
	});

	describe("Invalid input values", () => {
		it("should output warning for non-numeric input and ignore invalid values", () => {
			mockGetInput.mockImplementation((key: string) => {
				switch (key) {
					case "threshold-lines":
						return "invalid";
					case "threshold-statements":
						return "85";
					default:
						return "";
				}
			});

			const result = parseActionThresholds();

			expect(result).toEqual({
				statements: 85,
			});
			expect(mockWarning).toHaveBeenCalledWith(
				expect.stringContaining(
					'Invalid threshold-lines: "invalid" is not a valid number',
				),
			);
		});

		it("should output warning for out-of-range values (negative numbers)", () => {
			mockGetInput.mockImplementation((key: string) => {
				switch (key) {
					case "threshold-lines":
						return "-10";
					case "threshold-statements":
						return "85";
					default:
						return "";
				}
			});

			const result = parseActionThresholds();

			expect(result).toEqual({
				statements: 85,
			});
			expect(mockWarning).toHaveBeenCalledWith(
				expect.stringContaining("Invalid threshold-lines: -10 is out of range"),
			);
		});

		it("should output warning for out-of-range values (over 100)", () => {
			mockGetInput.mockImplementation((key: string) => {
				switch (key) {
					case "threshold-lines":
						return "150";
					case "threshold-statements":
						return "85";
					default:
						return "";
				}
			});

			const result = parseActionThresholds();

			expect(result).toEqual({
				statements: 85,
			});
			expect(mockWarning).toHaveBeenCalledWith(
				expect.stringContaining("Invalid threshold-lines: 150 is out of range"),
			);
		});

		it("should output warning for values containing decimal points", () => {
			mockGetInput.mockImplementation((key: string) => {
				switch (key) {
					case "threshold-lines":
						return "80.5";
					case "threshold-statements":
						return "85";
					default:
						return "";
				}
			});

			const result = parseActionThresholds();

			expect(result).toEqual({
				statements: 85,
			});
			expect(mockWarning).toHaveBeenCalledWith(
				expect.stringContaining(
					'Invalid threshold-lines: "80.5" is not an integer',
				),
			);
		});

		it("should output all warnings for multiple invalid values", () => {
			mockGetInput.mockImplementation((key: string) => {
				switch (key) {
					case "threshold-lines":
						return "invalid";
					case "threshold-statements":
						return "150";
					case "threshold-functions":
						return "80.5";
					case "threshold-branches":
						return "75";
					default:
						return "";
				}
			});

			const result = parseActionThresholds();

			expect(result).toEqual({
				branches: 75,
			});
			expect(mockWarning).toHaveBeenCalledWith(
				expect.stringContaining("Coverage threshold validation issues found:"),
			);

			const warningCall = mockWarning.mock.calls[0][0];
			expect(warningCall).toContain(
				'Invalid threshold-lines: "invalid" is not a valid number',
			);
			expect(warningCall).toContain(
				"Invalid threshold-statements: 150 is out of range",
			);
			expect(warningCall).toContain(
				'Invalid threshold-functions: "80.5" is not an integer',
			);
		});

		it("should output info message when all values are invalid but some input exists", () => {
			mockGetInput.mockImplementation((key: string) => {
				switch (key) {
					case "threshold-lines":
						return "invalid";
					case "threshold-statements":
						return "150";
					default:
						return "";
				}
			});

			const result = parseActionThresholds();

			expect(result).toEqual({});
			expect(mockWarning).toHaveBeenCalled();
			expect(mockInfo).toHaveBeenCalledWith(
				"No valid coverage thresholds found. Coverage report will be generated without threshold validation.",
			);
		});
	});

	describe("Edge cases", () => {
		it("should correctly handle values with leading/trailing spaces", () => {
			mockGetInput.mockImplementation((key: string) => {
				switch (key) {
					case "threshold-lines":
						return "  80  ";
					default:
						return "";
				}
			});

			const result = parseActionThresholds();

			expect(result).toEqual({
				lines: 80,
			});
			expect(mockWarning).not.toHaveBeenCalled();
		});

		it("should treat whitespace-only strings as empty strings", () => {
			mockGetInput.mockImplementation((key: string) => {
				switch (key) {
					case "threshold-lines":
						return "   ";
					default:
						return "";
				}
			});

			const result = parseActionThresholds();

			expect(result).toEqual({});
			expect(mockWarning).not.toHaveBeenCalled();
			expect(mockInfo).not.toHaveBeenCalled();
		});

		it("should correctly process string '0' as a number", () => {
			mockGetInput.mockImplementation((key: string) => {
				switch (key) {
					case "threshold-lines":
						return "0";
					default:
						return "";
				}
			});

			const result = parseActionThresholds();

			expect(result).toEqual({
				lines: 0,
			});
			expect(mockWarning).not.toHaveBeenCalled();
		});
	});
});
