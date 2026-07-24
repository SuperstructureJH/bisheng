import request from '~/api/request';
import type { FontScaleLevel } from '~/utils/fontScale';

type FontScalePreferenceResponse = {
  status_code: number;
  data: {
    font_scale_level: FontScaleLevel;
  };
};

export async function saveFontScalePreference(level: FontScaleLevel): Promise<FontScaleLevel> {
  const response = await request.put(
    '/api/v1/user/preferences/font-size',
    { level },
    { skip403Redirect: true },
  ) as FontScalePreferenceResponse;

  if (response.status_code !== 200) {
    throw new Error(response.status_code ? `request failed (${response.status_code})` : 'request failed');
  }
  return response.data.font_scale_level;
}
