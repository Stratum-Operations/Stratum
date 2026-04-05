from main import main
import sys

# Patch main to use a very small sample to debug empty output issue
import main
main.START_DATE = "2023-01-01"
main.END_DATE = "2023-03-01"
main.TOP_N = 5

if __name__ == "__main__":
    main.main()
