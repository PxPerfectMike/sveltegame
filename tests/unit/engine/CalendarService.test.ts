import { describe, it, expect } from 'vitest';
import {
	createCalendarService,
	type CalendarConfig,
	type CalendarService
} from '../../../src/lib/engine/time/CalendarService';

describe('CalendarService', () => {
	// Standard 4-season, 7-day config (like hotdog-tycoon)
	const standardConfig: CalendarConfig = {
		daysPerSeason: 7,
		seasons: ['Spring', 'Summer', 'Fall', 'Winter']
	};

	describe('createCalendarService', () => {
		it('should create a calendar service', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar).toBeDefined();
		});

		it('should return object with all required methods', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getSeason).toBeDefined();
			expect(calendar.getSeasonIndex).toBeDefined();
			expect(calendar.getDayInSeason).toBeDefined();
			expect(calendar.getYear).toBeDefined();
			expect(calendar.getSeasonProgress).toBeDefined();
			expect(calendar.getDayOfWeek).toBeDefined();
		});

		it('should throw if no seasons provided', () => {
			expect(() =>
				createCalendarService({
					daysPerSeason: 7,
					seasons: []
				})
			).toThrow();
		});

		it('should throw if daysPerSeason is 0 or negative', () => {
			expect(() =>
				createCalendarService({
					daysPerSeason: 0,
					seasons: ['Spring']
				})
			).toThrow();

			expect(() =>
				createCalendarService({
					daysPerSeason: -1,
					seasons: ['Spring']
				})
			).toThrow();
		});
	});

	describe('getSeason', () => {
		it('should return first season for day 1', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getSeason(1)).toBe('Spring');
		});

		it('should return first season for all days in first season', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getSeason(1)).toBe('Spring');
			expect(calendar.getSeason(7)).toBe('Spring');
		});

		it('should return second season after first season ends', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getSeason(8)).toBe('Summer');
		});

		it('should cycle through all seasons', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getSeason(1)).toBe('Spring'); // Day 1-7
			expect(calendar.getSeason(8)).toBe('Summer'); // Day 8-14
			expect(calendar.getSeason(15)).toBe('Fall'); // Day 15-21
			expect(calendar.getSeason(22)).toBe('Winter'); // Day 22-28
		});

		it('should wrap to first season in year 2', () => {
			const calendar = createCalendarService(standardConfig);
			// Year 1 is days 1-28 (4 seasons x 7 days)
			// Year 2 starts at day 29
			expect(calendar.getSeason(29)).toBe('Spring');
		});
	});

	describe('getSeasonIndex', () => {
		it('should return 0 for first season', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getSeasonIndex(1)).toBe(0);
		});

		it('should return correct index for each season', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getSeasonIndex(1)).toBe(0); // Spring
			expect(calendar.getSeasonIndex(8)).toBe(1); // Summer
			expect(calendar.getSeasonIndex(15)).toBe(2); // Fall
			expect(calendar.getSeasonIndex(22)).toBe(3); // Winter
		});

		it('should wrap correctly in subsequent years', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getSeasonIndex(29)).toBe(0); // Spring year 2
			expect(calendar.getSeasonIndex(36)).toBe(1); // Summer year 2
		});
	});

	describe('getDayInSeason', () => {
		it('should return 1 for first day of season', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getDayInSeason(1)).toBe(1); // Day 1 of Spring
			expect(calendar.getDayInSeason(8)).toBe(1); // Day 1 of Summer
		});

		it('should return correct day within season', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getDayInSeason(1)).toBe(1);
			expect(calendar.getDayInSeason(2)).toBe(2);
			expect(calendar.getDayInSeason(7)).toBe(7);
		});

		it('should reset for each new season', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getDayInSeason(7)).toBe(7); // Last day of Spring
			expect(calendar.getDayInSeason(8)).toBe(1); // First day of Summer
		});

		it('should work correctly in year 2', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getDayInSeason(29)).toBe(1); // Day 1 of Spring year 2
			expect(calendar.getDayInSeason(30)).toBe(2);
		});
	});

	describe('getYear', () => {
		it('should return 1 for day 1', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getYear(1)).toBe(1);
		});

		it('should return 1 for all of year 1', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getYear(1)).toBe(1);
			expect(calendar.getYear(28)).toBe(1); // Last day of year 1
		});

		it('should return 2 starting day 29', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getYear(29)).toBe(2);
		});

		it('should correctly calculate multiple years', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getYear(56)).toBe(2); // Last day of year 2
			expect(calendar.getYear(57)).toBe(3); // First day of year 3
			expect(calendar.getYear(100)).toBe(4); // Day 100
		});
	});

	describe('getSeasonProgress', () => {
		it('should return 0 for first day of season', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getSeasonProgress(1)).toBeCloseTo(0, 2);
		});

		it('should return ~1 for last day of season', () => {
			const calendar = createCalendarService(standardConfig);
			// Progress is (day-1)/(daysPerSeason-1) for smooth 0-1 range
			// Or (day-1)/daysPerSeason for 0 to <1 range
			const progress = calendar.getSeasonProgress(7);
			expect(progress).toBeGreaterThan(0.8);
			expect(progress).toBeLessThanOrEqual(1);
		});

		it('should increase through season', () => {
			const calendar = createCalendarService(standardConfig);
			const day1 = calendar.getSeasonProgress(1);
			const day4 = calendar.getSeasonProgress(4);
			const day7 = calendar.getSeasonProgress(7);

			expect(day4).toBeGreaterThan(day1);
			expect(day7).toBeGreaterThan(day4);
		});

		it('should reset for new season', () => {
			const calendar = createCalendarService(standardConfig);
			const lastDay = calendar.getSeasonProgress(7);
			const firstDay = calendar.getSeasonProgress(8);

			expect(lastDay).toBeGreaterThan(firstDay);
			expect(firstDay).toBeCloseTo(0, 2);
		});
	});

	describe('getDayOfWeek', () => {
		it('should return 0 for day 1 by default', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getDayOfWeek(1)).toBe(0);
		});

		it('should cycle through 0-6', () => {
			const calendar = createCalendarService(standardConfig);
			expect(calendar.getDayOfWeek(1)).toBe(0);
			expect(calendar.getDayOfWeek(2)).toBe(1);
			expect(calendar.getDayOfWeek(7)).toBe(6);
			expect(calendar.getDayOfWeek(8)).toBe(0); // Wraps
		});

		it('should respect startDayOfWeek config', () => {
			const calendar = createCalendarService({
				...standardConfig,
				startDayOfWeek: 1 // Start on Monday
			});
			expect(calendar.getDayOfWeek(1)).toBe(1);
			expect(calendar.getDayOfWeek(7)).toBe(0); // Wraps back to Sunday
		});

		it('should handle various startDayOfWeek values', () => {
			const calendar = createCalendarService({
				...standardConfig,
				startDayOfWeek: 3
			});
			expect(calendar.getDayOfWeek(1)).toBe(3);
			expect(calendar.getDayOfWeek(2)).toBe(4);
			expect(calendar.getDayOfWeek(5)).toBe(0); // Wraps
		});
	});

	describe('custom configurations', () => {
		it('should work with 2 seasons', () => {
			const calendar = createCalendarService({
				daysPerSeason: 10,
				seasons: ['Wet', 'Dry']
			});

			expect(calendar.getSeason(1)).toBe('Wet');
			expect(calendar.getSeason(10)).toBe('Wet');
			expect(calendar.getSeason(11)).toBe('Dry');
			expect(calendar.getSeason(20)).toBe('Dry');
			expect(calendar.getSeason(21)).toBe('Wet'); // Year 2
		});

		it('should work with 12 seasons (months)', () => {
			const calendar = createCalendarService({
				daysPerSeason: 30,
				seasons: [
					'January',
					'February',
					'March',
					'April',
					'May',
					'June',
					'July',
					'August',
					'September',
					'October',
					'November',
					'December'
				]
			});

			expect(calendar.getSeason(1)).toBe('January');
			expect(calendar.getSeason(31)).toBe('February');
			expect(calendar.getSeason(361)).toBe('January'); // Year 2
			expect(calendar.getYear(360)).toBe(1);
			expect(calendar.getYear(361)).toBe(2);
		});

		it('should work with 1 day per season', () => {
			const calendar = createCalendarService({
				daysPerSeason: 1,
				seasons: ['A', 'B', 'C']
			});

			expect(calendar.getSeason(1)).toBe('A');
			expect(calendar.getSeason(2)).toBe('B');
			expect(calendar.getSeason(3)).toBe('C');
			expect(calendar.getSeason(4)).toBe('A'); // Year 2
		});

		it('should work with single season (no cycling)', () => {
			const calendar = createCalendarService({
				daysPerSeason: 365,
				seasons: ['Eternal']
			});

			expect(calendar.getSeason(1)).toBe('Eternal');
			expect(calendar.getSeason(365)).toBe('Eternal');
			expect(calendar.getSeason(366)).toBe('Eternal'); // Year 2
			expect(calendar.getYear(365)).toBe(1);
			expect(calendar.getYear(366)).toBe(2);
		});
	});

	describe('edge cases', () => {
		it('should handle day 0 gracefully', () => {
			const calendar = createCalendarService(standardConfig);
			// Day 0 is "before game starts", treat as day 1 or handle specially
			expect(() => calendar.getSeason(0)).not.toThrow();
		});

		it('should handle negative days gracefully', () => {
			const calendar = createCalendarService(standardConfig);
			expect(() => calendar.getSeason(-1)).not.toThrow();
		});

		it('should handle very large day numbers', () => {
			const calendar = createCalendarService(standardConfig);
			expect(() => calendar.getSeason(10000)).not.toThrow();
			expect(calendar.getYear(10000)).toBeGreaterThan(350);
		});
	});
});
