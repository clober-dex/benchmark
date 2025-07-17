import * as fs from 'fs'

export const saveGasUsedResult = ({
  alias,
  gasUsed,
}: {
  alias: string
  gasUsed: BigNumber.Value
}) => {
  console.log(`Saving gas usage result for ${alias}: ${gasUsed}`)
  fs.writeFileSync(
    `results/${alias}.json`,
    JSON.stringify(
      {
        alias,
        gasUsage: gasUsed.toString(),
      },
      null,
      2,
    ),
  )
}
