/**
 * Configuration for the calendar service.
 */
export interface CalendarConfig {
	/** Number of days per season */
	daysPerSeason: number;
	/** Array of season names */
	seasons: string[];
	/** Starting day of week (0-6, default 0) */
	startDayOfWeek?: number;
}

/**
 * Calendar service for time-based game mechanics.
 */
export interface CalendarService {
	/** Get the season name for a given day */
	getSeason(day: number): string;
	/** Get the season index (0-based) for a given day */
	getSeasonIndex(day: number): number;
	/** Get the day number within the current season (1-based) */
	getDayInSeason(day: number): number;
	/** Get the year number (1-based) for a given day */
	getYear(day: number): number;
	/** Get season progress (0 at start, approaching 1 at end) */
	getSeasonProgress(day: number): number;
	/** Get day of week (0-6) for a given day */
	getDayOfWeek(day: number): number;
}

/**
 * Create a calendar service for time-based game mechanics.
 *
 * @param config - Calendar configuration
 * @returns Calendar service instance
 *
 * @example
 * ```typescript
 * const calendar = createCalendarService({
 *   daysPerSeason: 7,
 *   seasons: ['Spring', 'Summer', 'Fall', 'Winter']
 * });
 *
 * // Day 1 = Spring, Year 1
 * calendar.getSeason(1);      // 'Spring'
 * calendar.getSeasonIndex(1); // 0
 * calendar.getDayInSeason(1); // 1
 * calendar.getYear(1);        // 1
 *
 * // Day 8 = Summer, Year 1
 * calendar.getSeason(8);      // 'Summer'
 * calendar.getSeasonProgress(8); // ~0 (start of season)
 * ```
 */
export function createCalendarService(config: CalendarConfig): CalendarService {
	const { daysPerSeason, seasons, startDayOfWeek = 0 } = config;

	if (seasons.length === 0) {
		throw new Error('At least one season must be defined');
	}

	if (daysPerSeason <= 0) {
		throw new Error('daysPerSeason must be positive');
	}

	const daysPerYear = daysPerSeason * seasons.length;

	/**
	 * Normalize day to handle 0 and negative values.
	 * Treats day <= 0 as day 1.
	 */
	function normalizeDay(day: number): number {
		return Math.max(1, day);
	}

	return {
		getSeason(day: number): string {
			return seasons[this.getSeasonIndex(day)];
		},

		getSeasonIndex(day: number): number {
			const normalizedDay = normalizeDay(day);
			// Convert to 0-based, then calculate season
			const dayIndex = normalizedDay - 1;
			const dayInYear = dayIndex % daysPerYear;
			return Math.floor(dayInYear / daysPerSeason);
		},

		getDayInSeason(day: number): number {
			const normalizedDay = normalizeDay(day);
			const dayIndex = normalizedDay - 1;
			// Day within season (0-based) then convert to 1-based
			return (dayIndex % daysPerSeason) + 1;
		},

		getYear(day: number): number {
			const normalizedDay = normalizeDay(day);
			// Convert to 0-based, calculate year, then to 1-based
			return Math.floor((normalizedDay - 1) / daysPerYear) + 1;
		},

		getSeasonProgress(day: number): number {
			const dayInSeason = this.getDayInSeason(day);
			// Progress from 0 (day 1) to approaching 1 (last day)
			if (daysPerSeason === 1) {
				return 0; // Single day season, always at start
			}
			return (dayInSeason - 1) / (daysPerSeason - 1);
		},

		getDayOfWeek(day: number): number {
			const normalizedDay = normalizeDay(day);
			// Day 1 starts at startDayOfWeek, then cycles 0-6
			return (startDayOfWeek + normalizedDay - 1) % 7;
		}
	};
}
